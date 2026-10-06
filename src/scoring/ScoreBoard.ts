import type { ScorePayment } from "../mahjong/MahjongScoreCalculator.js";
import type { PlayerId } from "../shared/ids.js";

/** 公開持ち点。裏得点はここに含めず別に管理する。 */
export type ScoreBoard = ReadonlyMap<PlayerId, number>;

export function createScoreBoard(playerIds: readonly PlayerId[], initialScore: number): ScoreBoard {
  return new Map(playerIds.map((id) => [id, initialScore]));
}

export function applyPayments(board: ScoreBoard, payments: readonly ScorePayment[]): ScoreBoard {
  const next = new Map(board);
  for (const { payerId, receiverId, amount } of payments) {
    const payerScore = next.get(payerId);
    const receiverScore = next.get(receiverId);
    if (payerScore === undefined || receiverScore === undefined) {
      throw new Error(`持ち点表に存在しないプレイヤーへの支払いです: ${payerId} -> ${receiverId}`);
    }
    next.set(payerId, payerScore - amount);
    next.set(receiverId, receiverScore + amount);
  }
  return next;
}

export function totalScore(board: ScoreBoard): number {
  let total = 0;
  for (const score of board.values()) total += score;
  return total;
}
