/**
 * クライアント（と CPU）へ送るデータの型。
 * ここに置く型には、Reveal 前の秘密情報（人狼 ID・秘密ルール・裏得点・発動有無）を
 * 一般プレイヤー向けのフィールドとして持たせない（master-prompt 10.3）。
 */
import type { CpuLevel } from "./cpuLevel.js";
import type { GamePhase } from "./GamePhase.js";
import type { PlayerId, SecretRuleId, Seat, Wind } from "./ids.js";
import type { Discard, Meld, Tile } from "./mahjongTypes.js";

export interface PublicPlayerView {
  readonly id: PlayerId;
  readonly name: string;
  readonly seat: Seat;
  /** 公開持ち点（人狼の裏得点＝没収リスク分も含む）。 */
  readonly score: number;
  readonly controllerType: "HUMAN" | "CPU";
  readonly cpuLevel?: CpuLevel;
}

export interface PublicHandView {
  readonly playerId: PlayerId;
  /** 手牌の枚数だけを公開する。 */
  readonly handCount: number;
  readonly melds: readonly Meld[];
  readonly discards: readonly Discard[];
  readonly riichiDeclared: boolean;
}

export interface PublicRoundView {
  readonly wind: Wind;
  readonly kyoku: 1 | 2 | 3 | 4;
  readonly dealerSeat: Seat;
  readonly doraIndicators: readonly Tile[];
  readonly wallRemaining: number;
  readonly currentTurnSeat: Seat;
  readonly hands: readonly PublicHandView[];
}

/**
 * 人狼確認フェーズの進み具合。誰が済ませたかは出さず、人数だけを出す。
 * （人狼は秘密ルール予想などを即答できるため、順番から推測されるのを防ぐ）
 */
export interface WerewolfCheckProgressView {
  readonly readyCount: number;
  readonly votedCount: number;
  readonly guessedCount: number;
}

export interface WerewolfVoteRecord {
  readonly voterId: PlayerId;
  readonly targetId: PlayerId;
}

export interface SecretRuleGuessResult {
  readonly playerId: PlayerId;
  readonly guessedRuleId: SecretRuleId;
  readonly correct: boolean;
}

/**
 * Reveal 後に公開される場の記録。
 * 現在の場の秘密を表すキー名（werewolfPlayerId 等）と混同しないよう、revealed* という名前にする。
 */
export interface RevealedFieldRecord {
  readonly wind: Wind;
  readonly revealedWerewolfId: PlayerId;
  readonly revealedRuleId: SecretRuleId;
  readonly votes: readonly WerewolfVoteRecord[];
  readonly guesses: readonly SecretRuleGuessResult[];
  readonly werewolfIdentified: boolean;
  readonly revealedHiddenPoints: number;
  readonly unfiredPenaltyApplied: boolean;
}

/** 全プレイヤーに共通の公開情報。閲覧者によって内容が変わらない。 */
export interface PublicGameState {
  readonly roomId: string;
  readonly phase: GamePhase;
  readonly players: readonly PublicPlayerView[];
  readonly round?: PublicRoundView;
  readonly werewolfCheckProgress?: WerewolfCheckProgressView;
  readonly fieldHistory: readonly RevealedFieldRecord[];
}

export type PlayerRole = "WEREWOLF" | "VILLAGER";

/** 人狼本人にだけ付ける秘密情報。発動有無（secretRuleFired）は人狼本人にも送らない。 */
export interface WerewolfSecretView {
  /** 秘密ルールを選ぶ前だけ。 */
  readonly candidates?: readonly SecretRuleId[];
  /** 秘密ルールを選んだ後だけ。 */
  readonly secretRule?: SecretRuleId;
  readonly hiddenScore: number;
}

/** 閲覧者本人だけが見られる情報。 */
export interface SelfView {
  readonly playerId: PlayerId;
  readonly seat: Seat;
  readonly role?: PlayerRole;
  readonly roleConfirmed?: boolean;
  readonly hand?: readonly Tile[];
  readonly discussionReady?: boolean;
  readonly myVote?: PlayerId;
  readonly myGuess?: SecretRuleId;
  readonly werewolf?: WerewolfSecretView;
}

export interface PlayerView extends PublicGameState {
  readonly self: SelfView;
}
