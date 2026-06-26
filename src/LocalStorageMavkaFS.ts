import { MavkaFS } from "./MavkaFS.ts";

interface TLocalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class LocalStorageMavkaFS extends MavkaFS {
  protected prefix: string;
  protected localStorage: TLocalStorage;

  constructor(prefix: string, localStorage: TLocalStorage) {
    super();
    this.prefix = prefix || "";
    this.localStorage = localStorage;
  }

  public readFileSync(path: string): Uint8Array | string | null {
    const absolutePath = this.getAbsolutePath(path);
    const storageKey = this.prefix + absolutePath;
    const base64String = this.localStorage.getItem(storageKey);

    if (base64String === null) {
      return null;
    }

    const binaryString = atob(base64String);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }

  public checkIfExistsAndIsFile(path: string): boolean {
    const absolutePath = this.getAbsolutePath(path);
    const storageKey = this.prefix + absolutePath;
    return this.localStorage.getItem(storageKey) !== null;
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

  public writeFileSync(path: string, content: Uint8Array | string): void {
    const absolutePath = this.getAbsolutePath(path);
    const storageKey = this.prefix + absolutePath;
    let base64String: string;

    if (typeof content === "string") {
      const bytes = new TextEncoder().encode(content);
      base64String = btoa(String.fromCharCode(...bytes));
    } else {
      base64String = btoa(String.fromCharCode(...content));
    }

    this.localStorage.setItem(storageKey, base64String);
  }
}
