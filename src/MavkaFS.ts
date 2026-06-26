export abstract class MavkaFS {
  public abstract readFileSync(path: string): Uint8Array | string | null;
  public abstract checkIfExistsAndIsFile(path: string): boolean;
  public abstract getAbsolutePath(path: string): string;
}
