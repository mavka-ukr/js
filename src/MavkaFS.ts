export abstract class MavkaFS {
  public abstract readFileSync(path: string): Uint8Array | string | null;
  public abstract checkIfExistsAndIsFile(path: string): boolean;
  public abstract getAbsolutePath(path: string): string;

  public abstract delete(path: string, callback: (result: boolean, error: number) => void): void;
  public abstract append(path: string, data: Uint8Array, callback: (error: number) => void): void;
  public abstract write(path: string, data: Uint8Array, callback: (error: number) => void): void;
  public abstract read(path: string, callback: (data: Uint8Array, error: number) => void): void;
  public abstract mkdir(path: string, callback: (error: number) => void): void;
}
