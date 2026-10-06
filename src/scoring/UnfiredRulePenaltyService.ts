import type { ScorePayment } from "../mahjong/MahjongScoreCalculator.js";
import type { PlayerId } from "../shared/ids.js";
import { createEvenTransfersToOthers } from "./distribution.js";
import { applyPayments, type ScoreBoard } from "./ScoreBoard.js";

export const DEFAULT_UNFIRED_PENALTY_POINTS = 8000;

export interface UnfiredRulePenaltyInput {
  readonly scores: ScoreBoard;
  readonly werewolfPlayerId: PlayerId;
  /** その場で、誰かの和了で秘密ルールが一度でも成立したか。 */
  readonly secretRuleFired: boolean;
  readonly seatOrder: readonly PlayerId[];
  readonly penaltyPoints: number;
}

export interface UnfiredRulePenaltyResult {
  readonly scores: ScoreBoard;
  readonly penaltyApplied: boolean;
  readonly transfers: readonly ScorePayment[];
}

/**
 * 秘密ルールが場で一度も発動しなかった場合、人狼から減点して他の3人へ均等分配する
 * （master-prompt 8）。人狼が特定されたかどうかには関係しない。
 */
export function applyUnfiredRulePenalty(input: UnfiredRulePenaltyInput): UnfiredRulePenaltyResult {
  if (input.secretRuleFired || input.penaltyPoints === 0) {
    return { scores: input.scores, penaltyApplied: false, transfers: [] };
  }
  const transfers = createEvenTransfersToOthers(input.werewolfPlayerId, input.penaltyPoints, input.seatOrder);
  return { scores: applyPayments(input.scores, transfers), penaltyApplied: true, transfers };
}
