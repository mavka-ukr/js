import { MavkaBib } from "./MavkaBib.ts";
import { MavkaFS } from "./MavkaFS.ts";
import { MavkaProcess, type TMavkaColor } from "./MavkaProcess.ts";

type size_t = bigint;
type ssize_t = bigint;
type double = number;
type bool = number;
type char = number;
type int = number;
type PristriyMavkyWriteToStdoutColor = number;
type ptr<T> = bigint;
const NULL = 0n;
const TRUE = 1;
const FALSE = 0;

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
    return this.getExports().pristriy_mavky_malloc(size);
  }

  realloc(value: bigint, size: bigint): bigint {
    return this.getExports().pristriy_mavky_realloc(value, size);
  }

  free(value: bigint): void {
    this.getExports().pristriy_mavky_free(value);
  }

  extractString(dataPtr: bigint, size: bigint): string {
    const byteBuffer = new Uint8Array(
      this.getMemoryBuffer(),
      Number(dataPtr),
      Number(size),
    );
    return this.utf8Decoder.decode(byteBuffer);
  }

  extractBytes(dataPtr: bigint, size: bigint): Uint8Array {
    return new Uint8Array(
      this.getMemoryBuffer(),
      Number(dataPtr),
      Number(size),
    );
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

  shareBytes(data: Uint8Array): [bigint, bigint] {
    const size = BigInt(data.length);

    const ptr = this.malloc(size);

    const wasmMemoryView = new Uint8Array(
      this.getMemoryBuffer(),
      Number(ptr),
      Number(size),
    );

    wasmMemoryView.set(data);

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

  storeInt(value: int, ptr: bigint) {
    const wasmMemoryView = new Int32Array(
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
    значення: double | ssize_t | size_t,
    вихід_даних: ptr<ptr<char>>,
    вихід_розміру: ptr<size_t>,
  ): boolean {
    let strval: string;
    if (Number.isNaN(значення)) {
      strval = "невизначеність";
    } else if (
      typeof значення === "number" &&
      Math.abs(значення) === Infinity
    ) {
      strval = "нескінченність";
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

      pristriy_mavky_write_to_stdout: (data: ptr<char>, size: size_t): void => {
        this.process.print(this.extractString(data, size), 0);
      },

      pristriy_mavky_write_utf8_to_stdout: (
        color: PristriyMavkyWriteToStdoutColor,
        data: ptr<char>,
        size: size_t,
      ): void => {
        this.process.print(
          this.extractString(data, size),
          Number(color) as TMavkaColor,
        );
      },

      pristriy_mavky_double_pow: (value: double, exp: double): double => {
        return value ** exp;
      },

      pristriy_mavky_double_sin: (value: double): double => {
        return Math.sin(value);
      },

      pristriy_mavky_double_cos: (value: double): double => {
        return Math.cos(value);
      },

      pristriy_mavky_double_tan: (value: double): double => {
        return Math.tan(value);
      },

      pristriy_mavky_double_asin: (value: double): double => {
        return Math.asin(value);
      },

      pristriy_mavky_double_acos: (value: double): double => {
        return Math.acos(value);
      },

      pristriy_mavky_double_atan: (value: double): double => {
        return Math.atan(value);
      },

      pristriy_mavky_double_abs: (value: double): double => {
        return Math.abs(value);
      },

      pristriy_mavky_double_exp: (value: double): double => {
        return Math.exp(value);
      },

      pristriy_mavky_double_sqrt: (value: double): double => {
        return Math.sqrt(value);
      },

      pristriy_mavky_double_ceil: (value: double): double => {
        return Math.ceil(value);
      },

      pristriy_mavky_double_floor: (value: double): double => {
        return Math.floor(value);
      },

      pristriy_mavky_double_round: (value: double): double => {
        return Math.round(value);
      },

      pristriy_mavky_uint64_to_str: (
        value: size_t,
        data_out: ptr<ptr<char>>,
        size_out: ptr<size_t>,
      ): bool => {
        return this.handleConversion(value, data_out, size_out) ? TRUE : FALSE;
      },

      pristriy_mavky_int64_to_str: (
        value: ssize_t,
        data_out: ptr<ptr<char>>,
        size_out: ptr<size_t>,
      ): bool => {
        return this.handleConversion(value, data_out, size_out) ? TRUE : FALSE;
      },

      pristriy_mavky_double_to_str: (
        value: double,
        data_out: ptr<ptr<char>>,
        size_out: ptr<size_t>,
        exp_size_out: ptr<ssize_t>,
      ): bool => {
        const r = this.handleConversion(value, data_out, size_out);
        this.storeU64(0n, exp_size_out);
        return r ? TRUE : FALSE;
      },

      pristriy_mavky_str_to_double: (
        data: ptr<char>,
        size: size_t,
        out: ptr<double>,
      ): bool => {
        const value = this.extractString(data, size)
          .replaceAll("е", "e")
          .replaceAll("Е", "E");

        try {
          this.storeNumber(parseFloat(value), out);
        } catch (e) {
          return FALSE;
        }

        return TRUE;
      },

      pristriy_mavky_get_cwd: (
        data_out: ptr<ptr<char>>,
        size_out: ptr<size_t>,
      ): bool => {
        const cwd = this.process.getCwd();

        this.storeString(cwd, data_out, size_out);

        return TRUE;
      },

      pristriy_mavky_get_absolute_path: (
        path_data: ptr<char>,
        path_size: size_t,
        data_out: ptr<ptr<char>>,
        size_out: ptr<size_t>,
      ): bool => {
        const path = this.extractString(path_data, path_size);
        const absPath = this.fs.getAbsolutePath(path);

        this.storeString(absPath, data_out, size_out);

        return TRUE;
      },

      pristriy_mavky_check_if_file_exists: (
        path_data: ptr<char>,
        path_size: size_t,
      ): bool => {
        return this.fs.checkIfExistsAndIsFile(
          this.extractString(path_data, path_size),
        )
          ? TRUE
          : FALSE;
      },

      pristriy_mavky_read_file: (
        path_data: ptr<char>,
        path_size: size_t,
        data_out: ptr<ptr<char>>,
        size_out: ptr<size_t>,
      ): bool => {
        const path = this.extractString(path_data, path_size);

        const result = this.fs.readFileSync(path);
        if (result == null) {
          return FALSE;
        }

        if (typeof result === "string") {
          this.storeString(result, data_out, size_out);
        } else {
          this.storeBufferPtr(result, data_out);
          this.storeU64(BigInt(result.byteLength), size_out);
        }

        return TRUE;
      },

      pristriy_mavky_read_input_async: (
        prefix_data: ptr<char>,
        prefix_size: size_t,
        callback: ptr<
          (
            data: ptr<char>,
            data_size: size_t,
            eof: bool,
            arg: ptr<void>,
          ) => void
        >,
        arg: ptr<void>,
        allow_history: bool,
      ): bool => {
        const prefix = this.extractString(prefix_data, prefix_size);

        const cb =
          this.mapFn<
            (
              data: ptr<char>,
              data_size: size_t,
              eof: bool,
              arg: ptr<void>,
            ) => void
          >(callback);

        this.process.readline((value) => {
          if (value != null) {
            const [ptr, size] = this.shareString(value);
            cb(ptr, size, FALSE, arg);
          } else {
            cb(NULL, 0n, TRUE, arg);
          }
        }, prefix);

        return TRUE;
      },

      pristriy_mavky_dlopen: (
        path_data: ptr<char>,
        path_size: size_t,
        err_out: ptr<int>,
      ): ptr<void> => {
        this.storeInt(-1, err_out);
        return NULL;
      },

      pristriy_mavky_dlsym: (
        dl: ptr<void>,
        name_data: ptr<char>,
        name_size: size_t,
        err_out: ptr<int>,
      ): ptr<void> => {
        this.storeInt(-1, err_out);
        return NULL;
      },

      pristriy_mavky_dlclose: (dl: ptr<void>): int => {
        return -1;
      },

      pristriy_mavky_exit: (code: int): void => {
        this.process.exit(code);
      },
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
    const result = this.getExports().pristriy_mavky_get_version(
      versionDataPtrPtr,
      versionSizePtr,
    );
    if (!result) {
      throw new Error(
        `was not able to get mavka version: pristriy_mavky_get_version returns ${result}`,
      );
    }

    const dataPtr = this.loadU64(versionDataPtrPtr);
    const size = this.loadU64(versionSizePtr);

    const value = this.extractString(dataPtr, size);

    this.free(versionDataPtrPtr);
    this.free(versionSizePtr);

    return value;
  }

  run(args: string[]): int {
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
