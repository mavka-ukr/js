export type TMavkaProcessReadlineCallback = (value?: string) => void;

export const MavkaNOColor = 0;
export const MavkaColorRED = 1;
export const MavkaColorGREEN = 2;
export const MavkaBLUE = 3;
export const MavkaYELLOW = 4;

export type TMavkaColor =
  | typeof MavkaNOColor
  | typeof MavkaColorRED
  | typeof MavkaColorGREEN
  | typeof MavkaBLUE
  | typeof MavkaYELLOW;

export abstract class MavkaProcess {
  public abstract print(value: string, color?: TMavkaColor): void;
  public abstract readline(
    callback: TMavkaProcessReadlineCallback,
    prefix?: string,
  ): void;
  public abstract getCwd(): string;
  public abstract exit(code: number): void;
}
