/**
 * サーバー内部のゲーム状態。秘密情報を含むため、このままクライアントや CPU へ渡してはいけない。
 * 外へ出すときは必ず views/createPlayerView（CPU は createCpuView）を通す（master-prompt 10.2）。
 */
import type { FieldScoreState } from "../scoring/ScoreSettlementService.js";
import type { CpuConfig } from "../shared/cpuLevel.js";
import type { GamePhase } from "../shared/GamePhase.js";
import type { PlayerId, SecretRuleId, Seat, SessionId, Wind } from "../shared/ids.js";
import type { Discard, Meld, Tile } from "../shared/mahjongTypes.js";
import type { RevealedFieldRecord } from "../shared/PlayerView.js";

interface PlayerStateBase {
  readonly id: PlayerId;
  readonly name: string;
  readonly seat: Seat;
  /** 公開持ち点（人狼の裏得点＝没収リスク分も含む）。 */
  readonly score: number;
}

export type PlayerState =
  | (PlayerStateBase & { readonly controllerType: "HUMAN"; readonly sessionId: SessionId })
  | (PlayerStateBase & { readonly controllerType: "CPU"; readonly cpuConfig: CpuConfig });

/** 局ごとのプレイヤーの手。 */
export interface PlayerHandState {
  readonly hand: readonly Tile[];
  readonly melds: readonly Meld[];
  readonly discards: readonly Discard[];
  readonly riichiDeclared: boolean;
}

/** 現在の局。 */
export interface RoundState {
  readonly wind: Wind;
  readonly kyoku: 1 | 2 | 3 | 4;
  readonly dealerSeat: Seat;
  readonly wall: readonly Tile[];
  readonly deadWall: readonly Tile[];
  readonly doraIndicators: readonly Tile[];
  readonly currentTurnSeat: Seat;
  readonly hands: ReadonlyMap<PlayerId, PlayerHandState>;
}

/** 場（東場・南場）ごとの秘密状態。 */
export interface WindFieldState extends FieldScoreState {
  readonly wind: Wind;
  readonly ruleCandidates: readonly SecretRuleId[];
  readonly secretRuleId: SecretRuleId | null;
  /** 役職確認を済ませたプレイヤー（人狼はルール選択で確認済みになる）。 */
  readonly confirmedPlayerIds: ReadonlySet<PlayerId>;
  /** 議論フェーズで準備完了を押したプレイヤー。 */
  readonly readyPlayerIds: ReadonlySet<PlayerId>;
  readonly votes: ReadonlyMap<PlayerId, PlayerId>;
  readonly guesses: ReadonlyMap<PlayerId, SecretRuleId>;
}

export interface GameState {
  readonly roomId: string;
  readonly phase: GamePhase;
  /** 席順に並ぶ。 */
  readonly players: readonly PlayerState[];
  readonly windField: WindFieldState | null;
  readonly round: RoundState | null;
  readonly fieldHistory: readonly RevealedFieldRecord[];
}
