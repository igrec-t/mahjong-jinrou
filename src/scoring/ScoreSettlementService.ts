import { calculateAgari, type AgariContext, type AgariScore, type ScorePayment } from "../mahjong/MahjongScoreCalculator.js";
import type { SecretRuleResult } from "../secretRules/SecretRule.js";
import type { PlayerId } from "../shared/ids.js";
import { calculateHiddenScoreGain } from "./HiddenScoreCalculator.js";
import {
  confiscateAndDistributeStrategy,
  type HiddenScoreSettlementStrategy,
} from "./HiddenScoreSettlementStrategy.js";
import { applyPayments, type ScoreBoard } from "./ScoreBoard.js";
import { applyUnfiredRulePenalty, DEFAULT_UNFIRED_PENALTY_POINTS } from "./UnfiredRulePenaltyService.js";

/** 場（東場・南場）ごとの得点まわりの秘密状態。サーバー内部専用。 */
export interface FieldScoreState {
  readonly werewolfPlayerId: PlayerId;
  /** 裏得点（没収リスク分）。公開持ち点にすでに含まれている。 */
  readonly hiddenScore: number;
  /** 誰かの和了で秘密ルールが一度でも成立したか。 */
  readonly secretRuleFired: boolean;
}

export function createFieldScoreState(werewolfPlayerId: PlayerId): FieldScoreState {
  return { werewolfPlayerId, hiddenScore: 0, secretRuleFired: false };
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** 秘密ルールを含まない和了の情報（modifiers は SecretRuleResult から与える）。 */
export type AgariInput = DistributiveOmit<AgariContext, "modifiers">;

export interface AgariSettlementInput {
  readonly scores: ScoreBoard;
  readonly field: FieldScoreState;
  readonly agari: AgariInput;
  readonly secretRuleResult: SecretRuleResult;
}

export interface AgariSettlementResult {
  readonly scores: ScoreBoard;
  readonly field: FieldScoreState;
  /** 秘密ルールなしの結果。公開表示の役一覧に使う。 */
  readonly base: AgariScore;
  /** 秘密ルール込みの結果。実際の精算と公開表示の点数に使う。 */
  readonly modified: AgariScore;
}

/**
 * 和了の精算（master-prompt 7.1）。
 * 和了者が人狼か一般かに関係なく、秘密ルール込みの点数で精算する。
 * 人狼の和了のときだけ、差分を裏得点（没収リスク分）として記録する。
 */
export function settleAgari(input: AgariSettlementInput): AgariSettlementResult {
  const { scores, field, agari, secretRuleResult } = input;
  const base = calculateAgari({ ...agari, modifiers: [] });
  const modified = calculateAgari({
    ...agari,
    modifiers: secretRuleResult.matched ? secretRuleResult.modifiers : [],
  });

  const hiddenGain = calculateHiddenScoreGain({
    winnerId: agari.winnerId,
    werewolfPlayerId: field.werewolfPlayerId,
    base,
    modified,
  });

  return {
    scores: applyPayments(scores, modified.payments),
    field: {
      ...field,
      hiddenScore: field.hiddenScore + hiddenGain,
      secretRuleFired: field.secretRuleFired || secretRuleResult.matched,
    },
    base,
    modified,
  };
}

export interface FieldEndSettlementInput {
  readonly scores: ScoreBoard;
  readonly field: FieldScoreState;
  /** 投票で人狼が特定されたか（VotingService の結果）。 */
  readonly werewolfIdentified: boolean;
  /** 席順（手番順）に並んだ全プレイヤー。 */
  readonly seatOrder: readonly PlayerId[];
  readonly hiddenScoreStrategy?: HiddenScoreSettlementStrategy;
  readonly unfiredPenaltyPoints?: number;
}

export interface FieldEndSettlementResult {
  readonly scores: ScoreBoard;
  /** 精算後の場の状態（裏得点は0に戻る）。 */
  readonly field: FieldScoreState;
  /** Reveal で公開する、その場の裏得点の額。 */
  readonly revealedHiddenScore: number;
  readonly confiscated: number;
  readonly penaltyApplied: boolean;
  readonly transfers: readonly ScorePayment[];
}

/**
 * 場の終了時の精算（master-prompt 9.6 / 8）。
 * 裏得点の精算 → 未発動ペナルティの順に行う。
 */
export function settleFieldEnd(input: FieldEndSettlementInput): FieldEndSettlementResult {
  const strategy = input.hiddenScoreStrategy ?? confiscateAndDistributeStrategy;
  const { field, seatOrder } = input;

  const hidden = strategy.settle({
    scores: input.scores,
    werewolfPlayerId: field.werewolfPlayerId,
    hiddenScore: field.hiddenScore,
    werewolfIdentified: input.werewolfIdentified,
    seatOrder,
  });

  const penalty = applyUnfiredRulePenalty({
    scores: hidden.scores,
    werewolfPlayerId: field.werewolfPlayerId,
    secretRuleFired: field.secretRuleFired,
    seatOrder,
    penaltyPoints: input.unfiredPenaltyPoints ?? DEFAULT_UNFIRED_PENALTY_POINTS,
  });

  return {
    scores: penalty.scores,
    field: { ...field, hiddenScore: 0 },
    revealedHiddenScore: field.hiddenScore,
    confiscated: hidden.confiscated,
    penaltyApplied: penalty.penaltyApplied,
    transfers: [...hidden.transfers, ...penalty.transfers],
  };
}
