import type { PlayerId } from "../shared/ids.js";
import { sumAdditionalHan, type ScoreModifier } from "./ScoreModifier.js";

/** 支払い単位（master-prompt 7.3）。 */
export interface ScorePayment {
  readonly payerId: PlayerId;
  readonly receiverId: PlayerId;
  readonly amount: number;
}

interface AgariContextBase {
  /**
   * 役による翻数（ドラ込み、秘密ルールなし）。
   * Phase 7 以降は手牌から役判定して求める。現段階では呼び出し側が与える。
   */
  readonly han: number;
  readonly fu: number;
  readonly winnerId: PlayerId;
  readonly dealerId: PlayerId;
  /** 卓の全プレイヤー（ツモの支払者を決めるため）。 */
  readonly playerIds: readonly PlayerId[];
  /** 秘密ルール等による修正。省略時は修正なし。 */
  readonly modifiers?: readonly ScoreModifier[];
}

export type AgariContext =
  | (AgariContextBase & { readonly winType: "RON"; readonly loserId: PlayerId })
  | (AgariContextBase & { readonly winType: "TSUMO" });

export interface AgariScore {
  /** 修正込みの翻数。 */
  readonly han: number;
  readonly fu: number;
  /** 和了者の総獲得点（本場・供託は含まない）。 */
  readonly totalPoints: number;
  readonly payments: readonly ScorePayment[];
}

const MANGAN_BASIC_POINTS = 2000;

/** 基本点。満貫以上は切り上げ表に従う（切り上げ満貫は採用しない）。 */
export function calculateBasicPoints(han: number, fu: number): number {
  if (!Number.isInteger(han) || han < 1) {
    throw new RangeError(`翻数は1以上の整数である必要があります: ${han}`);
  }
  if (!Number.isInteger(fu) || fu < 20) {
    throw new RangeError(`符は20以上の整数である必要があります: ${fu}`);
  }
  if (han >= 13) return 8000;
  if (han >= 11) return 6000;
  if (han >= 8) return 4000;
  if (han >= 6) return 3000;
  if (han >= 5) return MANGAN_BASIC_POINTS;
  return Math.min(fu * 2 ** (han + 2), MANGAN_BASIC_POINTS);
}

function roundUpTo100(points: number): number {
  return Math.ceil(points / 100) * 100;
}

function assertParticipant(context: AgariContext, playerId: PlayerId, label: string): void {
  if (!context.playerIds.includes(playerId)) {
    throw new Error(`${label} が卓のプレイヤーに含まれていません: ${playerId}`);
  }
}

/** 和了の点数と支払いを計算する。 */
export function calculateAgari(context: AgariContext): AgariScore {
  assertParticipant(context, context.winnerId, "和了者");
  assertParticipant(context, context.dealerId, "親");

  const han = context.han + sumAdditionalHan(context.modifiers ?? []);
  const basicPoints = calculateBasicPoints(han, context.fu);
  const winnerIsDealer = context.winnerId === context.dealerId;

  let payments: ScorePayment[];
  if (context.winType === "RON") {
    assertParticipant(context, context.loserId, "放銃者");
    if (context.loserId === context.winnerId) {
      throw new Error("和了者と放銃者が同じです");
    }
    const amount = roundUpTo100(basicPoints * (winnerIsDealer ? 6 : 4));
    payments = [{ payerId: context.loserId, receiverId: context.winnerId, amount }];
  } else {
    payments = context.playerIds
      .filter((id) => id !== context.winnerId)
      .map((payerId) => {
        const paysDouble = winnerIsDealer || payerId === context.dealerId;
        const amount = roundUpTo100(basicPoints * (paysDouble ? 2 : 1));
        return { payerId, receiverId: context.winnerId, amount };
      });
  }

  const totalPoints = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return { han, fu: context.fu, totalPoints, payments };
}
