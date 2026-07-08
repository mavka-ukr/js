import { MavkaFS } from "./MavkaFS.ts";
import { type TMavkaNode } from "./Node.ts";

export class NodeMavkaFS extends MavkaFS {
  protected node: TMavkaNode;

  constructor(node: TMavkaNode) {
    super();

    this.node = node;
  }

  public readFileSync(path: string): Uint8Array | string | null {
    try {
      return this.node.fs.readFileSync(path);
    } catch {
      return null;
    }
  }

  public checkIfExistsAndIsFile(path: string): boolean {
    try {
      return this.node.fs.statSync(path).isFile();
    } catch {
      return false;
    }
  }

  public getAbsolutePath(path: string): string {
    return this.node.path.resolve(path);
  }

  public delete(path: string, callback: (result: boolean, error: number) => void): void {
    this.node.fs.rm(path, { recursive: true }, (err: any) => {
      if (!err) {
        callback(true, 0);
      } else if (err.code === "ENOENT") {
        callback(false, 0);
      } else {
        callback(false, 1);
      }
    });
  }

  public append(path: string, data: Uint8Array, callback: (error: number) => void): void {
    this.node.fs.appendFile(path, data, (err: any) => {
      callback(err ? 1 : 0);
    });
  }

  public write(path: string, data: Uint8Array, callback: (error: number) => void): void {
    this.node.fs.writeFile(path, data, (err: any) => {
      callback(err ? 1 : 0);
    });
  }

  public read(path: string, callback: (data: Uint8Array, error: number) => void): void {
    this.node.fs.readFile(path, (err: any, data: Uint8Array) => {
      if (err || !data) {
        callback(new Uint8Array(0), 1);
      } else {
        callback(new Uint8Array(data), 0);
      }
    });
  }

  public mkdir(path: string, callback: (error: number) => void): void {
    this.node.fs.mkdir(path, { recursive: true }, (err: any) => {
      callback(err ? 1 : 0);
    });
  }
}