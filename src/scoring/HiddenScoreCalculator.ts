import type { AgariScore } from "../mahjong/MahjongScoreCalculator.js";
import type { PlayerId } from "../shared/ids.js";

export interface HiddenScoreGainInput {
  readonly winnerId: PlayerId;
  readonly werewolfPlayerId: PlayerId;
  readonly base: AgariScore;
  readonly modified: AgariScore;
}

/**
 * 和了1回で増える裏得点（没収リスク分）。
 * 人狼の和了のときだけ、秘密ルールによる増加分（modified - base）になる。
 * この分は公開持ち点にすでに含まれている（master-prompt 7.1）。
 */
export function calculateHiddenScoreGain(input: HiddenScoreGainInput): number {
  if (input.winnerId !== input.werewolfPlayerId) return 0;
  const gain = input.modified.totalPoints - input.base.totalPoints;
  if (gain < 0) {
    throw new Error(`秘密ルール適用後の点数が通常の点数より低くなっています: ${gain}`);
  }
  return gain;
}
