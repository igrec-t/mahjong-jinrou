/**
 * CPU レベルの一覧。レベルを増やすときはここに足し、
 * cpu/ の難易度テーブル（Record<CpuLevel, ...>）にもエントリを足す（型エラーで漏れに気づける）。
 */
export const CPU_LEVELS = [1, 2, 3, 4, 5] as const;

export type CpuLevel = (typeof CPU_LEVELS)[number];

export interface CpuConfig {
  readonly level: CpuLevel;
}
