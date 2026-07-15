import pkg from "../package.json" with { type: "json" };
import { InMemoryMavkaFS, MavkaBib, MavkaBLUE, MavkaColorGREEN, MavkaColorRED, MavkaNOColor, MavkaProcess, MavkaWASM, MavkaYELLOW, TMavkaColor, TMavkaProcessReadlineCallback } from "../src";

class ExitMavkaException extends Error {
  exitCode: number;

  constructor(exitCode: number) {
    super("Mavka exited with code " + exitCode);

    this.exitCode = exitCode;
  }
}

const COLORS_MAP = {
  [MavkaNOColor]: undefined,
  [MavkaColorRED]: "red",
  [MavkaColorGREEN]: "green",
  [MavkaBLUE]: "blue",
  [MavkaYELLOW]: "yellow",
} as const;

let eid = 0;
const listeners = new Map();

class WebMavkaProcess extends MavkaProcess {
  constructor() {
    super();
  }

  public print(value: string, color?: TMavkaColor): void {
    if (color) {
      self.postMessage({ type: "PRINT", value, color: COLORS_MAP[color] });
    } else {
      self.postMessage({ type: "PRINT", value });
    }
  }

  public readline(
    callback: TMavkaProcessReadlineCallback,
    prefix?: string,
  ): void {
    const id = eid++;

    self.postMessage({ type: "READLINE", id, prefix });

    listeners.set(id, callback);
  }

  public getCwd(): string {
    return "/";
  }

  public exit(code: number): void {
    throw new ExitMavkaException(code);
  }
}

class WebMavkaBib extends MavkaBib { }


const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const mfs = new InMemoryMavkaFS();
const mproc = new WebMavkaProcess();
const mbib = new WebMavkaBib();

const mw = new MavkaWASM(mfs, mproc, mbib);

self.onmessage = (event) => {
  const eventData = event.data;

  if (eventData && typeof eventData === "object") {
    const type = eventData.type;
    const id = eventData.id;

    if (type === "INIT") {
      const mavkaWebUrl = eventData.mavkaWebUrl || "https://веб.мавка.укр";

      fetch(`${mavkaWebUrl}/wasm/мавка-${pkg.mavkaVersion}.wasm`)
        .then((r) => r.arrayBuffer())
        .then((buffer) => mw.instantiate(buffer))
        .then(() => {
          self.postMessage({ type: "MAVKA_READY" });
        });
    }

    if (type === "WRITE") {
      const path = eventData.path;
      const value = eventData.value;

      if (typeof value === "string" || value instanceof Uint8Array) {
        mfs.writeFileSync(path, value);
        self.postMessage({ type: "WRITE_RESULT", id });
      } else {
        self.postMessage({ type: "WRITE_RESULT", id, error: "Can write only string and Uint8Array!" });
      }
    }

    if (type === "READ") {
      const path = eventData.path;
      const resultType = eventData.resultType;

      let result = mfs.readFileSync(path);

      if (typeof result === "string") {
        if (resultType === "bytes") {
          result = textEncoder.encode(result);
        }
      }
      if (result instanceof Uint8Array) {
        if (resultType === "string") {
          result = textDecoder.decode(result);
        }
      }

      self.postMessage({ type: "READ_RESULT", id, result });
    }

    if (type === "RUN") {
      const args = eventData.args;

      let resultCode: number = 0;

      try {
        resultCode = mw.run([
          "/програми/мавка",
          ...args
        ]);
      } catch (e) {
        if (e && e instanceof ExitMavkaException) {
          resultCode = e.exitCode;
        } else {
          resultCode = 1;
        }
      }

      self.postMessage({ type: "RUN_RESULT", id, resultCode });
    }

    if (type === "READLINE_RESULT") {
      const value = eventData.value;

      const l = listeners.get(id);

      l(value);
    }
  }
};

