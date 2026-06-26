import {
  MavkaBLUE,
  MavkaColorGREEN,
  MavkaColorRED,
  MavkaNOColor,
  MavkaProcess,
  MavkaYELLOW,
  type TMavkaColor,
  type TMavkaProcessReadlineCallback,
} from "./MavkaProcess.ts";
import { type TMavkaNode } from "./Node.ts";

const COLORS_MAP = {
  [MavkaNOColor]: "\x1b[0m",
  [MavkaColorRED]: "\x1b[31m",
  [MavkaColorGREEN]: "\x1b[32m",
  [MavkaBLUE]: "\x1b[34m",
  [MavkaYELLOW]: "\x1b[33m",
} as const;

export class NodeMavkaProcess extends MavkaProcess {
  protected rl: any = null;
  protected readlineCallback: TMavkaProcessReadlineCallback | null = null;
  protected node: TMavkaNode;

  constructor(node: TMavkaNode) {
    super();

    this.node = node;
  }

  public print(value: string, color?: TMavkaColor): void {
    if (color) {
      const selectedColor = COLORS_MAP[color] || COLORS_MAP[MavkaNOColor];

      this.node.process.stdout.write(
        `${selectedColor}${value}${COLORS_MAP[MavkaNOColor]}`,
      );
    } else {
      this.node.process.stdout.write(value);
    }
  }

  public readline(
    callback: TMavkaProcessReadlineCallback,
    prefix?: string,
  ): void {
    this.readlineCallback = callback;

    this.getRl().question(prefix, (value: string) => {
      this.readlineCallback = null;

      callback(value);
    });
  }

  protected getRl() {
    if (this.rl) return this.rl;

    this.rl = this.node.readline.createInterface({
      input: this.node.process.stdin,
      output: this.node.process.stdout,
    });

    this.rl.on("close", () => {
      this.rl = null;

      if (this.readlineCallback) {
        const cb = this.readlineCallback;

        this.readlineCallback = null;

        cb();
      }
    });

    return this.rl;
  }

  public getCwd(): string {
    return this.node.process.cwd();
  }

  public exit(code: number): void {
    if (this.rl) {
      this.rl.close();
    }

    this.node.process.exit(code);
  }
}
