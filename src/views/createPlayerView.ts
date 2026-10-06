/**
 * GameState からクライアントへ送るデータを作る、唯一の出口（master-prompt 10.3）。
 *
 * - ホワイトリスト方式：送ってよい項目だけを選んで新しいオブジェクトを組み立てる。GameState をスプレッドしない。
 * - 秘密情報は閲覧者が人狼本人のときだけ self.werewolf に入れる。一般プレイヤー向けにはキー自体を作らない。
 */
import type { GameState, PlayerHandState, PlayerState, RoundState, WindFieldState } from "../game/GameState.js";
import type { GamePhase } from "../shared/GamePhase.js";
import type { PlayerId } from "../shared/ids.js";
import type {
  PlayerView,
  PublicGameState,
  PublicHandView,
  PublicPlayerView,
  PublicRoundView,
  SelfView,
  WerewolfSecretView,
} from "../shared/PlayerView.js";

/** 議論・投票・予想の進み具合を出すフェーズ。 */
const WEREWOLF_CHECK_PHASES: ReadonlySet<GamePhase> = new Set<GamePhase>([
  "DISCUSSION",
  "WEREWOLF_VOTING",
  "SECRET_RULE_GUESS",
]);

function toPublicPlayer(player: PlayerState): PublicPlayerView {
  const base = {
    id: player.id,
    name: player.name,
    seat: player.seat,
    score: player.score,
    controllerType: player.controllerType,
  };
  return player.controllerType === "CPU" ? { ...base, cpuLevel: player.cpuConfig.level } : base;
}

function getHand(round: RoundState, playerId: PlayerId): PlayerHandState {
  const hand = round.hands.get(playerId);
  if (hand === undefined) {
    throw new Error(`局の手牌にプレイヤーがいません: ${playerId}`);
  }
  return hand;
}

function toPublicHand(playerId: PlayerId, hand: PlayerHandState): PublicHandView {
  return {
    playerId,
    handCount: hand.hand.length,
    melds: hand.melds,
    discards: hand.discards,
    riichiDeclared: hand.riichiDeclared,
  };
}

function toPublicRound(round: RoundState, players: readonly PlayerState[]): PublicRoundView {
  return {
    wind: round.wind,
    kyoku: round.kyoku,
    dealerSeat: round.dealerSeat,
    doraIndicators: round.doraIndicators,
    wallRemaining: round.wall.length,
    currentTurnSeat: round.currentTurnSeat,
    hands: players.map((player) => toPublicHand(player.id, getHand(round, player.id))),
  };
}

/** 全プレイヤー共通の公開情報。閲覧者によって変わらない。 */
export function createPublicGameState(state: GameState): PublicGameState {
  const field = state.windField;
  return {
    roomId: state.roomId,
    phase: state.phase,
    players: state.players.map(toPublicPlayer),
    ...(state.round !== null ? { round: toPublicRound(state.round, state.players) } : {}),
    ...(field !== null && WEREWOLF_CHECK_PHASES.has(state.phase)
      ? {
          werewolfCheckProgress: {
            readyCount: field.readyPlayerIds.size,
            votedCount: field.votes.size,
            guessedCount: field.guesses.size,
          },
        }
      : {}),
    fieldHistory: state.fieldHistory,
  };
}

function createWerewolfSecretView(field: WindFieldState): WerewolfSecretView {
  return field.secretRuleId === null
    ? { candidates: field.ruleCandidates, hiddenScore: field.hiddenScore }
    : { secretRule: field.secretRuleId, hiddenScore: field.hiddenScore };
}

function createSelfView(state: GameState, viewer: PlayerState): SelfView {
  const field = state.windField;
  const isWerewolf = field !== null && field.werewolfPlayerId === viewer.id;
  const hand = state.round?.hands.get(viewer.id);
  const myVote = field?.votes.get(viewer.id);
  const myGuess = field?.guesses.get(viewer.id);

  return {
    playerId: viewer.id,
    seat: viewer.seat,
    ...(field !== null
      ? {
          role: isWerewolf ? "WEREWOLF" : "VILLAGER",
          roleConfirmed: field.confirmedPlayerIds.has(viewer.id),
        }
      : {}),
    ...(hand !== undefined ? { hand: hand.hand } : {}),
    ...(field !== null && WEREWOLF_CHECK_PHASES.has(state.phase)
      ? { discussionReady: field.readyPlayerIds.has(viewer.id) }
      : {}),
    ...(myVote !== undefined ? { myVote } : {}),
    ...(myGuess !== undefined ? { myGuess } : {}),
    ...(isWerewolf ? { werewolf: createWerewolfSecretView(field) } : {}),
  };
}

export function findPlayer(state: GameState, playerId: PlayerId): PlayerState {
  const player = state.players.find((p) => p.id === playerId);
  if (player === undefined) {
    throw new Error(`ゲームに存在しないプレイヤーです: ${playerId}`);
  }
  return player;
}

/** viewerPlayerId に見せてよい情報だけを含むデータを作る。 */
export function createPlayerView(state: GameState, viewerPlayerId: PlayerId): PlayerView {
  const viewer = findPlayer(state, viewerPlayerId);
  return { ...createPublicGameState(state), self: createSelfView(state, viewer) };
}
