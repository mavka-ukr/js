import { MavkaFS } from "./MavkaFS.ts";

interface TLocalStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
  length?: number;
  key?(index: number): string | null;
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

  public delete(path: string, callback: (result: boolean, error: number) => void): void {
    try {
      const absolutePath = this.getAbsolutePath(path);
      const targetPrefix = this.prefix + absolutePath;
      const exactKey = targetPrefix;
      const dirPrefix = targetPrefix.endsWith("/") ? targetPrefix : targetPrefix + "/";

      let deletedAny = false;

      if (this.localStorage.getItem(exactKey) !== null) {
        if (typeof this.localStorage.removeItem === "function") {
          this.localStorage.removeItem(exactKey);
        } else {
          this.localStorage.setItem(exactKey, "");
        }
        deletedAny = true;
      }

      if (typeof this.localStorage.length === "number" && typeof this.localStorage.key === "function") {
        const keysToRemove: string[] = [];
        for (let i = 0; i < this.localStorage.length; i++) {
          const k = this.localStorage.key(i);
          if (k && k.startsWith(dirPrefix)) {
            keysToRemove.push(k);
          }
        }

        for (const k of keysToRemove) {
          if (typeof this.localStorage.removeItem === "function") {
            this.localStorage.removeItem(k);
          } else {
            this.localStorage.setItem(k, "");
          }
          deletedAny = true;
        }
      }

      callback(deletedAny, deletedAny ? 0 : 1);
    } catch {
      callback(false, 1);
    }
  }

  public append(path: string, data: Uint8Array, callback: (error: number) => void): void {
    try {
      const existing = this.readFileSync(path);
      let combined: Uint8Array;

      if (!existing) {
        combined = data;
      } else {
        const existingBytes = typeof existing === "string"
          ? new TextEncoder().encode(existing)
          : existing;

        combined = new Uint8Array(existingBytes.length + data.length);
        combined.set(existingBytes, 0);
        combined.set(data, existingBytes.length);
      }

      this.writeFileSync(path, combined);
      callback(0);
    } catch {
      callback(1);
    }
  }

  public write(path: string, data: Uint8Array, callback: (error: number) => void): void {
    try {
      this.writeFileSync(path, data);
      callback(0);
    } catch {
      callback(1);
    }
  }

  public read(path: string, callback: (data: Uint8Array, error: number) => void): void {
    try {
      const res = this.readFileSync(path);
      if (res === null) {
        callback(new Uint8Array(0), 1);
        return;
      }

      const bytes = typeof res === "string"
        ? new TextEncoder().encode(res)
        : res;

      callback(bytes, 0);
    } catch {
      callback(new Uint8Array(0), 1);
    }
  }

  public mkdir(path: string, callback: (error: number) => void): void {
    callback(0);
  }
}