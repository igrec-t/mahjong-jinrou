/**
 * 情報漏洩テスト（master-prompt 19.3）。
 * Reveal 前の一般プレイヤー・一般 CPU に、人狼・秘密ルール・裏得点・他人の手牌・山が渡らないことを確かめる。
 */
import { describe, expect, it } from "vitest";
import type { PlayerId } from "../../src/shared/ids.js";
import type { RevealedFieldRecord } from "../../src/shared/PlayerView.js";
import { createCpuView } from "../../src/views/createCpuView.js";
import { createPlayerView, createPublicGameState } from "../../src/views/createPlayerView.js";
import {
  collectKeys,
  collectStrings,
  createGameState,
  PLAYER_IDS,
  PRE_REVEAL_PHASES,
  SECRET_SETUPS,
  setupFor,
} from "../fixtures/gameStateFixture.js";

/** 仕様書で、一般プレイヤー向け JSON に含まれてはいけないと定められた文字列。 */
const SPEC_FORBIDDEN_STRINGS = ["werewolfPlayerId", "secretRule", "hiddenScore", "specialRuleMatched", "bonusHan"];

/** 上記に加えて、一般プレイヤー向けデータにあってはいけないキー。 */
const FORBIDDEN_KEYS = [
  ...SPEC_FORBIDDEN_STRINGS,
  "secretRuleId",
  "secretRuleFired",
  "ruleCandidates",
  "candidates",
  "werewolf",
  "sessionId",
  "wall",
  "deadWall",
];

/** viewer が人狼ではない秘密のパターン。 */
function villagerSetups(viewer: PlayerId) {
  return SECRET_SETUPS.filter((s) => s.werewolfPlayerId !== viewer);
}

describe.each(PRE_REVEAL_PHASES)("Reveal 前（%s）", (phase) => {
  it.each(PLAYER_IDS)("一般プレイヤー %s の View は、秘密の中身を変えても完全に同じ", (viewer) => {
    const views = villagerSetups(viewer).map((secret) =>
      createPlayerView(createGameState({ phase, secret }), viewer),
    );
    for (const view of views.slice(1)) {
      expect(view).toEqual(views[0]);
    }
  });

  it.each(PLAYER_IDS)("一般プレイヤー %s の JSON に秘密のキーも値も含まれない", (viewer) => {
    for (const secret of villagerSetups(viewer)) {
      const view = createPlayerView(createGameState({ phase, secret }), viewer);
      const json = JSON.stringify(view);
      for (const forbidden of SPEC_FORBIDDEN_STRINGS) {
        expect(json).not.toContain(forbidden);
      }

      const keys = collectKeys(view);
      for (const key of FORBIDDEN_KEYS) {
        expect(keys).not.toContain(key);
      }

      // 閲覧者自身が選んだ予想は、秘密ではないので除外する
      const strings = collectStrings(view);
      if (view.self.myGuess !== undefined) strings.delete(view.self.myGuess);
      for (const ruleId of [secret.secretRuleId, ...secret.ruleCandidates]) {
        expect(strings).not.toContain(ruleId);
      }
      expect([...strings].filter((s) => s.startsWith("session-"))).toEqual([]);
    }
  });

  it.each(PLAYER_IDS)("公開部分は閲覧者 %s が人狼でも一般でも同じ（差は self だけ）", (viewer) => {
    for (const secret of SECRET_SETUPS) {
      const state = createGameState({ phase, secret });
      const { self, ...publicPart } = createPlayerView(state, viewer);
      expect(self.playerId).toBe(viewer);
      expect(publicPart).toEqual(createPublicGameState(state));
    }
  });
});

describe("局の情報", () => {
  it("自分の手牌は見え、他人の手牌・山・未公開の王牌は見えない", () => {
    const state = createGameState({ phase: "PLAYING", secret: setupFor("p2") });
    const round = state.round;
    if (round === null) throw new Error("局がありません");

    for (const viewer of PLAYER_IDS) {
      const view = createPlayerView(state, viewer);
      const strings = collectStrings(view);

      const ownHand = round.hands.get(viewer)?.hand ?? [];
      expect(view.self.hand).toEqual(ownHand);

      const doraIds = new Set(round.doraIndicators.map((t) => t.id));
      const hiddenTiles = [
        ...PLAYER_IDS.filter((id) => id !== viewer).flatMap((id) => round.hands.get(id)?.hand ?? []),
        ...round.wall,
        ...round.deadWall.filter((t) => !doraIds.has(t.id)),
      ];
      expect(hiddenTiles.length).toBeGreaterThan(0);
      for (const tile of hiddenTiles) {
        expect(strings).not.toContain(tile.id);
      }
    }
  });

  it("他人の手牌は枚数だけ、副露・捨て牌・リーチは公開される", () => {
    const state = createGameState({ phase: "PLAYING", secret: setupFor("p2") });
    const view = createPlayerView(state, "p1");

    expect(view.round?.wallRemaining).toBe(state.round?.wall.length);
    expect(view.round?.hands.map((h) => h.handCount)).toEqual([13, 13, 10, 13]);
    expect(view.round?.hands[2]?.melds).toHaveLength(1);
    expect(view.round?.hands[3]?.riichiDeclared).toBe(true);
    expect(view.round?.doraIndicators).toHaveLength(1);
  });
});

describe("役職と人狼本人の情報", () => {
  it("一般プレイヤーには役職 VILLAGER だけが付き、self.werewolf はない", () => {
    const view = createPlayerView(createGameState({ phase: "PLAYING", secret: setupFor("p2") }), "p1");
    expect(view.self.role).toBe("VILLAGER");
    expect("werewolf" in view.self).toBe(false);
  });

  it("ルール選択中の人狼には候補3つが見え、選んだ後は選んだルールだけが見える", () => {
    const secret = setupFor("p2");

    const selecting = createPlayerView(createGameState({ phase: "SECRET_RULE_SELECTION", secret }), "p2");
    expect(selecting.self.role).toBe("WEREWOLF");
    expect(selecting.self.roleConfirmed).toBe(false);
    expect(selecting.self.werewolf).toEqual({ candidates: secret.ruleCandidates, hiddenScore: secret.hiddenScore });

    const playing = createPlayerView(createGameState({ phase: "PLAYING", secret }), "p2");
    expect(playing.self.werewolf).toEqual({ secretRule: secret.secretRuleId, hiddenScore: secret.hiddenScore });
  });

  it("秘密ルールが発動したかどうかは人狼本人にも送らない", () => {
    for (const phase of PRE_REVEAL_PHASES) {
      const view = createPlayerView(createGameState({ phase, secret: setupFor("p2") }), "p2");
      expect(collectKeys(view)).not.toContain("secretRuleFired");
    }
  });

  it("場が始まる前は役職を出さない", () => {
    const view = createPlayerView(createGameState({ phase: "WAITING", secret: null }), "p1");
    expect("role" in view.self).toBe(false);
    expect("round" in view).toBe(false);
  });

  it("存在しないプレイヤーの View は作れない", () => {
    const state = createGameState({ phase: "PLAYING", secret: setupFor("p2") });
    expect(() => createPlayerView(state, "x9")).toThrow();
  });
});

describe("人狼確認フェーズの進み具合", () => {
  it("人数だけを公開し、他人の投票先・予想は出さない", () => {
    const view = createPlayerView(createGameState({ phase: "SECRET_RULE_GUESS", secret: setupFor("p3") }), "p1");

    expect(view.werewolfCheckProgress).toEqual({ readyCount: 2, votedCount: 2, guessedCount: 1 });
    expect(view.self.myVote).toBe("p3");
    expect("myGuess" in view.self).toBe(false);
    // p2 の投票先（p4）と予想（OPEN_HAND_BONUS）は p1 には見えない
    expect(collectStrings(view)).not.toContain("OPEN_HAND_BONUS");
  });

  it("ルール選択中は、誰が確認を済ませたかを出さない（人狼の特定を防ぐ）", () => {
    const view = createPlayerView(createGameState({ phase: "SECRET_RULE_SELECTION", secret: setupFor("p3") }), "p1");
    expect("werewolfCheckProgress" in view).toBe(false);
    expect(view.self.roleConfirmed).toBe(true);
  });
});

describe("Reveal 後の記録", () => {
  const eastRecord: RevealedFieldRecord = {
    wind: "EAST",
    revealedWerewolfId: "p2",
    revealedRuleId: "DAMATEN_BONUS",
    votes: [{ voterId: "p1", targetId: "p2" }],
    guesses: [{ playerId: "p1", guessedRuleId: "DAMATEN_BONUS", correct: true }],
    werewolfIdentified: true,
    revealedHiddenPoints: 3800,
    unfiredPenaltyApplied: false,
  };

  it("公開済みの東場の記録は全員に見え、南場の秘密の検査には引っかからない", () => {
    const state = createGameState({ phase: "PLAYING", secret: setupFor("p4"), fieldHistory: [eastRecord] });
    const view = createPlayerView(state, "p1");

    expect(view.fieldHistory).toEqual([eastRecord]);
    const json = JSON.stringify(view);
    for (const forbidden of SPEC_FORBIDDEN_STRINGS) {
      expect(json).not.toContain(forbidden);
    }
  });
});

describe("CPU の View", () => {
  it("CPU は人間と同じ情報を受け取る", () => {
    const state = createGameState({ phase: "PLAYING", secret: setupFor("p1") });
    expect(createCpuView(state, "p2")).toEqual(createPlayerView(state, "p2"));
  });

  it.each(PRE_REVEAL_PHASES)("一般 CPU の View は秘密の中身に依存しない（%s）", (phase) => {
    for (const cpu of ["p2", "p3"] as const) {
      const views = villagerSetups(cpu).map((secret) => createCpuView(createGameState({ phase, secret }), cpu));
      for (const view of views.slice(1)) {
        expect(view).toEqual(views[0]);
      }
      const keys = collectKeys(views[0]);
      for (const key of FORBIDDEN_KEYS) {
        expect(keys).not.toContain(key);
      }
    }
  });

  it("人狼の CPU には、人間の人狼と同じく秘密ルールと裏得点が見える", () => {
    const secret = setupFor("p3");
    const view = createCpuView(createGameState({ phase: "PLAYING", secret }), "p3");
    expect(view.self.werewolf).toEqual({ secretRule: secret.secretRuleId, hiddenScore: secret.hiddenScore });
  });

  it("CPU の View は内部状態と参照を共有しない", () => {
    const state = createGameState({ phase: "PLAYING", secret: setupFor("p1") });
    const view = createCpuView(state, "p2");
    expect(view.self.hand).toEqual(state.round?.hands.get("p2")?.hand);
    expect(view.self.hand).not.toBe(state.round?.hands.get("p2")?.hand);
  });

  it("人間のプレイヤーに CPU の View は作れない", () => {
    const state = createGameState({ phase: "PLAYING", secret: setupFor("p2") });
    expect(() => createCpuView(state, "p1")).toThrow();
  });
});
