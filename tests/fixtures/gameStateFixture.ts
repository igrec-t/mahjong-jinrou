/**
 * PlayerView のテスト用の GameState。
 * 秘密の中身（SecretSetup）だけを差し替えた状態を作れるようにしてある。
 */
import type { GameState, PlayerHandState, PlayerState, RoundState, WindFieldState } from "../../src/game/GameState.js";
import { createTileSet } from "../../src/mahjong/Tile.js";
import type { GamePhase } from "../../src/shared/GamePhase.js";
import type { PlayerId, SecretRuleId } from "../../src/shared/ids.js";
import type { Tile } from "../../src/shared/mahjongTypes.js";
import type { RevealedFieldRecord } from "../../src/shared/PlayerView.js";

export const PLAYER_IDS = ["p1", "p2", "p3", "p4"] as const;

/** Reveal 前のフェーズ（秘密情報が一般プレイヤーへ出てはいけない期間）。 */
export const PRE_REVEAL_PHASES: readonly GamePhase[] = [
  "WEREWOLF_SELECTION",
  "SECRET_RULE_SELECTION",
  "PLAYING",
  "DISCUSSION",
  "WEREWOLF_VOTING",
  "SECRET_RULE_GUESS",
];

const SELECTION_PHASES: ReadonlySet<GamePhase> = new Set<GamePhase>(["WEREWOLF_SELECTION", "SECRET_RULE_SELECTION"]);
const CHECK_PHASES: ReadonlySet<GamePhase> = new Set<GamePhase>(["DISCUSSION", "WEREWOLF_VOTING", "SECRET_RULE_GUESS"]);

export interface SecretSetup {
  readonly werewolfPlayerId: PlayerId;
  readonly ruleCandidates: readonly SecretRuleId[];
  readonly secretRuleId: SecretRuleId;
  readonly hiddenScore: number;
  readonly secretRuleFired: boolean;
}

/** 人狼・ルール・裏得点・発動有無がすべて異なる4通りの秘密。 */
export const SECRET_SETUPS: readonly SecretSetup[] = [
  {
    werewolfPlayerId: "p1",
    ruleCandidates: ["RED_TILE_BONUS", "DAMATEN_BONUS", "OPEN_HAND_BONUS"],
    secretRuleId: "RED_TILE_BONUS",
    hiddenScore: 1300,
    secretRuleFired: true,
  },
  {
    werewolfPlayerId: "p2",
    ruleCandidates: ["DAMATEN_BONUS", "THREE_CALL_BONUS", "EXTENDED_DORA"],
    secretRuleId: "DAMATEN_BONUS",
    hiddenScore: 3800,
    secretRuleFired: true,
  },
  {
    werewolfPlayerId: "p3",
    ruleCandidates: ["EXTENDED_DORA", "RED_TILE_BONUS", "THREE_CALL_BONUS"],
    secretRuleId: "EXTENDED_DORA",
    hiddenScore: 0,
    secretRuleFired: false,
  },
  {
    werewolfPlayerId: "p4",
    ruleCandidates: ["OPEN_HAND_BONUS", "THREE_CALL_BONUS", "DAMATEN_BONUS"],
    secretRuleId: "THREE_CALL_BONUS",
    hiddenScore: 4100,
    secretRuleFired: true,
  },
];

export function setupFor(werewolfPlayerId: PlayerId): SecretSetup {
  const setup = SECRET_SETUPS.find((s) => s.werewolfPlayerId === werewolfPlayerId);
  if (setup === undefined) throw new Error(`setup がありません: ${werewolfPlayerId}`);
  return setup;
}

function createPlayers(): PlayerState[] {
  return [
    { id: "p1", name: "Alice", seat: 0, score: 31000, controllerType: "HUMAN", sessionId: "session-p1" },
    { id: "p2", name: "CPU-1", seat: 1, score: 22000, controllerType: "CPU", cpuConfig: { level: 1 } },
    { id: "p3", name: "CPU-5", seat: 2, score: 18300, controllerType: "CPU", cpuConfig: { level: 5 } },
    { id: "p4", name: "Bob", seat: 3, score: 28700, controllerType: "HUMAN", sessionId: "session-p4" },
  ];
}

function createRound(): RoundState {
  const tiles = createTileSet();
  let cursor = 0;
  const take = (count: number): Tile[] => {
    const taken = tiles.slice(cursor, cursor + count);
    cursor += count;
    return taken;
  };
  const takeOne = (): Tile => {
    const [tile] = take(1);
    if (tile === undefined) throw new Error("牌が足りません");
    return tile;
  };

  const hands = new Map<PlayerId, PlayerHandState>([
    ["p1", { hand: take(13), melds: [], discards: [], riichiDeclared: false }],
    [
      "p2",
      {
        hand: take(13),
        melds: [],
        discards: [{ tile: takeOne(), tsumogiri: true, riichiDeclaration: false, called: false }],
        riichiDeclared: false,
      },
    ],
    [
      "p3",
      {
        hand: take(10),
        melds: [{ type: "PON", tiles: take(3), calledFrom: "p1" }],
        discards: [],
        riichiDeclared: false,
      },
    ],
    [
      "p4",
      {
        hand: take(13),
        melds: [],
        discards: [{ tile: takeOne(), tsumogiri: false, riichiDeclaration: true, called: false }],
        riichiDeclared: true,
      },
    ],
  ]);
  const deadWall = take(14);
  const doraIndicator = deadWall[4];
  if (doraIndicator === undefined) throw new Error("王牌が足りません");

  return {
    wind: "EAST",
    kyoku: 1,
    dealerSeat: 0,
    wall: tiles.slice(cursor),
    deadWall,
    doraIndicators: [doraIndicator],
    currentTurnSeat: 0,
    hands,
  };
}

function createWindField(phase: GamePhase, secret: SecretSetup): WindFieldState {
  const selecting = SELECTION_PHASES.has(phase);
  return {
    wind: "EAST",
    werewolfPlayerId: secret.werewolfPlayerId,
    ruleCandidates: secret.ruleCandidates,
    secretRuleId: selecting ? null : secret.secretRuleId,
    hiddenScore: secret.hiddenScore,
    secretRuleFired: secret.secretRuleFired,
    // ルール選択中は、人狼だけがまだ確認済みになっていない
    confirmedPlayerIds: new Set(selecting ? PLAYER_IDS.filter((id) => id !== secret.werewolfPlayerId) : PLAYER_IDS),
    readyPlayerIds: new Set(CHECK_PHASES.has(phase) ? ["p2", "p3"] : []),
    votes: new Map(
      phase === "WEREWOLF_VOTING" || phase === "SECRET_RULE_GUESS"
        ? [["p1", "p3"], ["p2", "p4"]]
        : [],
    ),
    guesses: new Map(phase === "SECRET_RULE_GUESS" ? [["p2", "OPEN_HAND_BONUS"]] : []),
  };
}

export interface GameStateOptions {
  readonly phase: GamePhase;
  /** null なら場が始まっていない（WAITING など）。 */
  readonly secret: SecretSetup | null;
  readonly fieldHistory?: readonly RevealedFieldRecord[];
}

export function createGameState({ phase, secret, fieldHistory = [] }: GameStateOptions): GameState {
  return {
    roomId: "room-1",
    phase,
    players: createPlayers(),
    windField: secret === null ? null : createWindField(phase, secret),
    round: phase === "PLAYING" ? createRound() : null,
    fieldHistory,
  };
}

/** 値の中に含まれる全ての文字列。 */
export function collectStrings(value: unknown): Set<string> {
  const found = new Set<string>();
  const walk = (v: unknown): void => {
    if (typeof v === "string") {
      found.add(v);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (typeof v === "object" && v !== null) {
      Object.values(v).forEach(walk);
    }
  };
  walk(value);
  return found;
}

/** 値の中に含まれる全てのオブジェクトのキー。 */
export function collectKeys(value: unknown): Set<string> {
  const found = new Set<string>();
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (typeof v === "object" && v !== null) {
      for (const [key, child] of Object.entries(v)) {
        found.add(key);
        walk(child);
      }
    }
  };
  walk(value);
  return found;
}
