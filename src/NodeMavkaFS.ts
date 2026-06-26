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
}
