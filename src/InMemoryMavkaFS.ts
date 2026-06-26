import { MavkaFS } from "./MavkaFS.ts";

export class InMemoryMavkaFS extends MavkaFS {
  private files: Map<string, Uint8Array | string>;

  constructor() {
    super();
    this.files = new Map<string, Uint8Array | string>();
  }

  public writeFileSync(path: string, content: Uint8Array | string): void {
    const absolutePath = this.getAbsolutePath(path);
    this.files.set(absolutePath, content);
  }

  public readFileSync(path: string): Uint8Array | string | null {
    const absolutePath = this.getAbsolutePath(path);
    return this.files.get(absolutePath) ?? null;
  }

  public checkIfExistsAndIsFile(path: string): boolean {
    const absolutePath = this.getAbsolutePath(path);
    return this.files.has(absolutePath);
  }

  public getAbsolutePath(path: string): string {
    let resolvedPath = path.startsWith("/") ? path : "/" + path;
    const parts = resolvedPath.split("/");
    const stack: string[] = [];

    for (const part of parts) {
      if (part === "" || part === ".") {
        continue;
      }
      if (part === "..") {
        stack.pop();
      } else {
        stack.push(part);
      }
    }

    return "/" + stack.join("/");
  }
}
