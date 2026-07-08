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

  public delete(path: string, callback: (result: boolean, error: number) => void): void {
    const absolutePath = this.getAbsolutePath(path);
    const existed = this.files.has(absolutePath);
    if (existed) {
      this.files.delete(absolutePath);
      callback(true, 0);
    } else {
      callback(false, 1);
    }
  }

  public append(path: string, data: Uint8Array, callback: (error: number) => void): void {
    const absolutePath = this.getAbsolutePath(path);
    const existing = this.files.get(absolutePath);

    if (existing === undefined) {
      this.files.set(absolutePath, data);
    } else {
      const existingBytes = typeof existing === "string"
        ? new TextEncoder().encode(existing)
        : existing;

      const combined = new Uint8Array(existingBytes.length + data.length);
      combined.set(existingBytes, 0);
      combined.set(data, existingBytes.length);
      this.files.set(absolutePath, combined);
    }

    callback(0);
  }

  public write(path: string, data: Uint8Array, callback: (error: number) => void): void {
    const absolutePath = this.getAbsolutePath(path);
    this.files.set(absolutePath, data);
    callback(0);
  }

  public read(path: string, callback: (data: Uint8Array, error: number) => void): void {
    const absolutePath = this.getAbsolutePath(path);
    const file = this.files.get(absolutePath);

    if (file === undefined) {
      callback(new Uint8Array(0), 1);
      return;
    }

    const data = typeof file === "string" ? new TextEncoder().encode(file) : file;
    callback(data, 0);
  }

  public mkdir(path: string, callback: (error: number) => void): void {
    callback(0);
  }
}