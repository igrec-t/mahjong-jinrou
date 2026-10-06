import type { ScorePayment } from "../mahjong/MahjongScoreCalculator.js";
import type { PlayerId } from "../shared/ids.js";

/**
 * 指定プレイヤー以外を、下家から席順に並べる。
 * seatOrder は席順（手番順）に並んだ全プレイヤー。
 */
export function othersFromShimocha(seatOrder: readonly PlayerId[], playerId: PlayerId): PlayerId[] {
  const index = seatOrder.indexOf(playerId);
  if (index === -1) {
    throw new Error(`席順に存在しないプレイヤーです: ${playerId}`);
  }
  return [...seatOrder.slice(index + 1), ...seatOrder.slice(0, index)];
}

/**
 * amount を100点単位で均等に分ける。端数の100点は recipients の先頭から1本ずつ配る
 * （master-prompt 7.5 の仮決定）。
 */
export function distributeEvenly(amount: number, recipients: readonly PlayerId[]): number[] {
  if (!Number.isInteger(amount) || amount < 0 || amount % 100 !== 0) {
    throw new RangeError(`分配額は0以上の100点単位である必要があります: ${amount}`);
  }
  if (recipients.length === 0) {
    throw new Error("分配先がいません");
  }
  const units = amount / 100;
  const baseUnits = Math.floor(units / recipients.length);
  const remainder = units % recipients.length;
  return recipients.map((_, i) => (baseUnits + (i < remainder ? 1 : 0)) * 100);
}

/** payerId から他の全員へ、下家から順に均等分配する支払いを作る。 */
export function createEvenTransfersToOthers(
  payerId: PlayerId,
  amount: number,
  seatOrder: readonly PlayerId[],
): ScorePayment[] {
  const recipients = othersFromShimocha(seatOrder, payerId);
  const shares = distributeEvenly(amount, recipients);
  return recipients.flatMap((receiverId, i) => {
    const share = shares[i] ?? 0;
    return share > 0 ? [{ payerId, receiverId, amount: share }] : [];
  });
}
