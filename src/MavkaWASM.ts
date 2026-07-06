import { MavkaBib } from "./MavkaBib.ts";
import { MavkaFS } from "./MavkaFS.ts";
import { MavkaProcess, type TMavkaColor } from "./MavkaProcess.ts";

type адреса = bigint;
type адреса_п8 = bigint;
type адреса_адреса_п8 = bigint;
type адреса_природне = bigint;
type адреса_ціле = bigint;
type адреса_р64 = bigint;
type природне = bigint;
type р64 = number;
type ц64 = bigint;
type п64 = bigint;
type ц32 = number;
type логічне = number;

export class MavkaWASM {
  public fs: MavkaFS;
  public process: MavkaProcess;
  public bib: MavkaBib;

  protected instance: WebAssembly.Instance | null = null;
  private utf8Decoder = new TextDecoder("utf-8");
  private textEncoder = new TextEncoder();

  constructor(fs: MavkaFS, process: MavkaProcess, bib: MavkaBib) {
    this.fs = fs;
    this.process = process;
    this.bib = bib;
  }

  private getExports() {
    if (!this.instance) {
      throw new Error("Not instantiated!");
    }

    return this.instance.exports as Record<string, any> & {
      memory: WebAssembly.Memory;
    };
  }

  private getMemoryBuffer() {
    return this.getExports().memory.buffer;
  }

  mapFn<F>(ptr: bigint): F {
    const exports = this.getExports();
    const table = exports.__indirect_function_table || exports.table;
    return table.get(ptr) as F;
  }

  malloc(size: bigint): bigint {
    return this.getExports().пристрій_мавки_виділити(size);
  }

  realloc(value: bigint, size: bigint): bigint {
    return this.getExports().пристрій_мавки_перевиділити(value, size);
  }

  free(value: bigint): void {
    this.getExports().пристрій_мавки_звільнити(value);
  }

  extractString(dataPtr: bigint, size: bigint): string {
    const byteBuffer = new Uint8Array(
      this.getMemoryBuffer(),
      Number(dataPtr),
      Number(size),
    );
    return this.utf8Decoder.decode(byteBuffer);
  }

  sharePtrs(ptrs: bigint[]): [bigint, bigint] {
    const elementCount = ptrs.length;
    const byteSize = BigInt(elementCount * 8);
    const arrayPtr = this.malloc(byteSize);

    const wasmMemoryView = new BigInt64Array(
      this.getMemoryBuffer(),
      Number(arrayPtr),
      elementCount,
    );
    wasmMemoryView.set(ptrs);

    return [arrayPtr, byteSize];
  }

  shareString(str: string): [bigint, bigint] {
    const encodedString = this.textEncoder.encode(str);
    const size = BigInt(encodedString.length);
    const sizeWithNull = size + 1n;

    const ptr = this.malloc(sizeWithNull);

    const wasmMemoryView = new Uint8Array(
      this.getMemoryBuffer(),
      Number(ptr),
      Number(sizeWithNull),
    );

    wasmMemoryView.set(encodedString);
    wasmMemoryView[Number(size)] = 0;

    return [ptr, size];
  }

  storeU64(value: bigint, ptr: bigint): void {
    const wasmMemoryView = new BigUint64Array(
      this.getMemoryBuffer(),
      Number(ptr),
      1,
    );
    wasmMemoryView[0] = value;
  }

  storeNumber(value: number, ptr: bigint) {
    const wasmMemoryView = new Float64Array(
      this.getMemoryBuffer(),
      Number(ptr),
      1,
    );
    wasmMemoryView[0] = value;
  }

  storePtr(value: bigint, ptr: bigint): void {
    this.storeU64(value, ptr);
  }

  storeBufferPtr(buf: Uint8Array, ptr: bigint): void {
    const size = BigInt(buf.byteLength);
    const bufPtr = this.malloc(size);

    const wasmDataView = new Uint8Array(
      this.getMemoryBuffer(),
      Number(bufPtr),
      buf.byteLength,
    );
    wasmDataView.set(buf);

    this.storePtr(bufPtr, ptr);
  }

  storeString(value: string, dataPtr: bigint, lenPtr: bigint) {
    const [ptr, size] = this.shareString(value);

    this.storePtr(ptr, dataPtr);
    this.storeU64(size, lenPtr);
  }

  loadU64(ptr: bigint): bigint {
    const wasmMemoryView = new BigUint64Array(
      this.getMemoryBuffer(),
      Number(ptr),
      1,
    );
    return wasmMemoryView[0];
  }

  private handleConversion(
    значення: р64 | ц64 | п64,
    вихід_даних: адреса_адреса_п8,
    вихід_розміру: адреса_природне,
  ): boolean {
    let strval: string;
    if (Number.isNaN(значення)) {
      strval = "невизначеність"
    } else if (typeof значення === "number" && Math.abs(значення) === Infinity) {
      strval = "нескінченність"
    } else {
      strval = String(значення).replace(/[eE]/g, "е");
    }
    this.storeString(strval, вихід_даних, вихід_розміру);
    return true;
  }

  async instantiate(wasmBuffer: BufferSource): Promise<void> {
    if (this.instance) {
      throw new Error("Already instantiated!");
    }

    const env = {
      fmod: (a: number, b: number) => a % b,
      пристрій_мавки_читати_ю8: (
        дані_перед: адреса_п8,
        розмір_перед: природне,
        вихід_даних: адреса_адреса_п8,
        вихід_розміру: адреса_природне,
        вихід_кінець_файлу: адреса_природне,
        дозволити_історію: природне,
      ) => {
        return false;
      },
      пристрій_мавки_читати_ю8_асинхронно: (
        дані_перед: адреса_п8,
        розмір_перед: природне,
        обробник: адреса,
        аргумент: адреса,
        дозволити_історію: природне,
      ) => {
        const prefix = this.extractString(дані_перед, розмір_перед);
        const callback =
          this.mapFn<
            (
              дані: адреса_п8,
              розмір: природне,
              кінець_файлу: природне,
              аргумент: адреса,
            ) => void
          >(обробник);

        this.process.readline((value) => {
          if (value != null) {
            const [ptr, size] = this.shareString(value);
            callback(ptr, size, 0n, аргумент);
          } else {
            callback(0n, 0n, 1n, аргумент);
          }
        }, prefix);
      },
      пристрій_мавки_вивести_ю8: (
        колір: природне,
        дані: адреса_п8,
        розмір: природне,
      ) => {
        this.process.print(
          this.extractString(дані, розмір),
          Number(колір) as TMavkaColor,
        );
      },
      пристрій_мавки_вивести_шлях: (
        колір: природне,
        дані: адреса_п8,
        розмір: природне,
      ) => {
        this.process.print(
          this.extractString(дані, розмір),
          Number(колір) as TMavkaColor,
        );
      },
      пристрій_мавки_перетворити_р64_в_ю8: (
        значення: р64,
        вихід_даних: адреса_адреса_п8,
        вихід_розміру: адреса_природне,
        вихід_розміру_експоненти: адреса_ціле,
      ) => {
        return this.handleConversion(значення, вихід_даних, вихід_розміру);
      },
      пристрій_мавки_отримати_р64_з_ю8: (дані: адреса_п8, розмір: природне, вихід: адреса_р64): логічне => {
        const value = this.extractString(дані, розмір).replaceAll("е", "e").replaceAll("Е", "E");

        try {
          this.storeNumber(parseFloat(value), вихід);
        } catch (e) {
          return 0;
        }

        return 1;
      },
      пристрій_мавки_перетворити_ц64_в_ю8: (
        значення: ц64,
        вихід_даних: адреса_адреса_п8,
        вихід_розміру: адреса_природне,
      ) => {
        return this.handleConversion(значення, вихід_даних, вихід_розміру);
      },
      пристрій_мавки_перетворити_п64_в_ю8: (
        значення: п64,
        вихід_даних: адреса_адреса_п8,
        вихід_розміру: адреса_природне,
      ) => {
        return this.handleConversion(значення, вихід_даних, вихід_розміру);
      },
      пристрій_мавки_піднести_до_степеня_р64: (значення: р64, степінь: р64) => {
        return значення ** степінь;
      },
      пристрій_мавки_вийти: (код_виходу: ц32) => {
        this.process.exit(код_виходу);
      },
      пристрій_мавки_прочитати_файл: (
        дані_шляху: адреса_п8,
        розмір_шляху: природне,
        вихід_даних: адреса_адреса_п8,
        вихід_розміру: адреса_природне,
      ) => {
        const path = this.extractString(дані_шляху, розмір_шляху);
        const result = this.fs.readFileSync(path);
        if (result == null) {
          return false;
        }
        if (typeof result === "string") {
          this.storeString(result, вихід_даних, вихід_розміру);
        } else {
          this.storeBufferPtr(result, вихід_даних);
          this.storeU64(BigInt(result.byteLength), вихід_розміру);
        }
        return true;
      },
      пристрій_мавки_перевірити_чи_шлях_існує_і_є_файлом: (
        дані_шляху: адреса_п8,
        розмір_шляху: природне,
      ) => {
        return this.fs.checkIfExistsAndIsFile(
          this.extractString(дані_шляху, розмір_шляху),
        );
      },
      пристрій_мавки_отримати_абсолютний_шлях: (
        дані_шляху: адреса_п8,
        розмір_шляху: природне,
        вихід_даних: адреса_адреса_п8,
        вихід_розміру: адреса_природне,
      ) => {
        const path = this.extractString(дані_шляху, розмір_шляху);
        const absPath = this.fs.getAbsolutePath(path);
        this.storeString(absPath, вихід_даних, вихід_розміру);
        return true;
      },
      пристрій_мавки_отримати_поточний_шлях_процесу: (
        вихід_даних: адреса_адреса_п8,
        вихід_розміру: адреса_природне,
      ) => {
        const cwd = this.process.getCwd();
        this.storeString(cwd, вихід_даних, вихід_розміру);
        return true;
      },
      бібліотека_мавки_синус_р64: (значення: р64): р64 => { return Math.sin(значення); },
      бібліотека_мавки_косинус_р64: (значення: р64): р64 => { return Math.cos(значення); },
      бібліотека_мавки_тангенс_р64: (значення: р64): р64 => { return Math.tan(значення); },
      бібліотека_мавки_арксинус_р64: (значення: р64): р64 => { return Math.asin(значення); },
      бібліотека_мавки_арккосинус_р64: (значення: р64): р64 => { return Math.acos(значення); },
      бібліотека_мавки_арктангенс_р64: (значення: р64): р64 => { return Math.atan(значення); },
      бібліотека_мавки_абсолютне_р64: (значення: р64): р64 => { return Math.abs(значення); },
      бібліотека_мавки_експонента_р64: (значення: р64): р64 => { return Math.exp(значення); },
      бібліотека_мавки_корінь2_р64: (значення: р64): р64 => { return Math.sqrt(значення); },
      бібліотека_мавки_стеля_р64: (значення: р64): р64 => { return Math.ceil(значення); },
      бібліотека_мавки_підлога_р64: (значення: р64): р64 => { return Math.floor(значення); },
      бібліотека_мавки_округлити_р64: (значення: р64): р64 => { return Math.round(значення); },
      бібліотека_мавки_лог_р64: (значення: р64): р64 => { return Math.log(значення); },
      бібліотека_мавки_лог2_р64: (значення: р64): р64 => { return Math.log2(значення); },
      бібліотека_мавки_лог10_р64: (значення: р64): р64 => { return Math.log10(значення); },
    } as const;

    const { instance } = await WebAssembly.instantiate(wasmBuffer, {
      env: new Proxy(env, {
        get(target, prop) {
          if (prop in target) {
            return target[prop as keyof typeof target];
          }
          return () => {
            throw new Error(`"${String(prop)}" не втілено для WASM!`);
          };
        },
      }),
    });

    this.instance = instance;
  }

  getVersion(): string {
    const versionDataPtrPtr = this.malloc(8n);
    const versionSizePtr = this.malloc(8n);
    const result = this.getExports().пристрій_мавки_отримати_версію_як_ю8(
      versionDataPtrPtr,
      versionSizePtr,
    );
    if (!result) {
      throw new Error(
        `was not able to get mavka version: пристрій_мавки_отримати_версію_як_ю8 returns ${result}`,
      );
    }

    const dataPtr = this.loadU64(versionDataPtrPtr);
    const size = this.loadU64(versionSizePtr);

    const value = this.extractString(dataPtr, size);

    this.free(versionDataPtrPtr);
    this.free(versionSizePtr);

    return value;
  }

  run(args: string[]): ц32 {
    const exports = this.getExports();

    const аргументи = args.map((arg) => {
      if (typeof arg !== "string") {
        throw new Error("args must be strings!");
      }
      return this.shareString(arg)[0];
    });

    const [ptr] = this.sharePtrs(аргументи);

    return exports.wasmMain(args.length, ptr);
  }
}
