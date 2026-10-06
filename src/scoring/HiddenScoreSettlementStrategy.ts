import type { ScorePayment } from "../mahjong/MahjongScoreCalculator.js";
import type { PlayerId } from "../shared/ids.js";
import { createEvenTransfersToOthers } from "./distribution.js";
import { applyPayments, type ScoreBoard } from "./ScoreBoard.js";

export interface HiddenScoreSettlementContext {
  readonly scores: ScoreBoard;
  readonly werewolfPlayerId: PlayerId;
  readonly hiddenScore: number;
  readonly werewolfIdentified: boolean;
  readonly seatOrder: readonly PlayerId[];
}

export interface HiddenScoreSettlementResult {
  readonly scores: ScoreBoard;
  readonly confiscated: number;
  readonly transfers: readonly ScorePayment[];
}

/**
 * 場の終了時の裏得点精算。システム加算・供託・チップ方式などへ差し替えられるようにする
 * （master-prompt 7.3）。
 */
export interface HiddenScoreSettlementStrategy {
  settle(context: HiddenScoreSettlementContext): HiddenScoreSettlementResult;
}

/**
 * MVP の方式。裏得点は公開持ち点に含まれているため、
 * 特定成功なら人狼から没収して他の3人へ均等分配し、特定失敗なら何もしない（そのまま確定）。
 */
export const confiscateAndDistributeStrategy: HiddenScoreSettlementStrategy = {
  settle({ scores, werewolfPlayerId, hiddenScore, werewolfIdentified, seatOrder }) {
    if (!werewolfIdentified || hiddenScore === 0) {
      return { scores, confiscated: 0, transfers: [] };
    }
    const transfers = createEvenTransfersToOthers(werewolfPlayerId, hiddenScore, seatOrder);
    return { scores: applyPayments(scores, transfers), confiscated: hiddenScore, transfers };
  },
};
