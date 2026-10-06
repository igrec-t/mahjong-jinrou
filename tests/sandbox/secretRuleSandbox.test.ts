/**
 * Secret Rule Sandbox（master-prompt 19.1）
 *
 * 完全な麻雀を作る前に、秘密ルールと裏得点の精算だけを検証する。
 * 卓：p1(親) → p2 → p3 → p4 の席順、全員 25000 点スタート。
 * 基準の和了：子のロン 3翻30符（3900点）。秘密ルール +1翻で 4翻30符（7700点）。
 */
import { describe, expect, it } from "vitest";
import type { SecretRuleResult } from "../../src/secretRules/SecretRule.js";
import { SECRET_RULE_NOT_MATCHED } from "../../src/secretRules/SecretRule.js";
import { createScoreBoard, totalScore, type ScoreBoard } from "../../src/scoring/ScoreBoard.js";
import {
  createFieldScoreState,
  settleAgari,
  settleFieldEnd,
  type AgariInput,
} from "../../src/scoring/ScoreSettlementService.js";

const SEAT_ORDER = ["p1", "p2", "p3", "p4"] as const;
const INITIAL_SCORE = 25000;
const INITIAL_TOTAL = INITIAL_SCORE * SEAT_ORDER.length;

const PLUS_ONE_HAN: SecretRuleResult = { matched: true, modifiers: [{ type: "ADD_HAN", value: 1 }] };
const PLUS_TWO_HAN: SecretRuleResult = { matched: true, modifiers: [{ type: "ADD_HAN", value: 2 }] };

/** p2 が p3 から 3翻30符をロン（子・3900点）。 */
const P2_RON_FROM_P3: AgariInput = {
  han: 3, fu: 30, winType: "RON", winnerId: "p2", loserId: "p3", dealerId: "p1", playerIds: SEAT_ORDER,
};

function newTable(): ScoreBoard {
  return createScoreBoard(SEAT_ORDER, INITIAL_SCORE);
}

/** 初期点からの増減を席順で返す。 */
function deltas(scores: ScoreBoard): number[] {
  return SEAT_ORDER.map((id) => (scores.get(id) ?? Number.NaN) - INITIAL_SCORE);
}

describe("Secret Rule Sandbox: 和了の精算", () => {
  it("Case A: 一般プレイヤーの和了（3900 → 7700）は +7700、裏得点 0", () => {
    const result = settleAgari({
      scores: newTable(),
      field: createFieldScoreState("p4"),
      agari: P2_RON_FROM_P3,
      secretRuleResult: PLUS_ONE_HAN,
    });

    expect(result.base.totalPoints).toBe(3900);
    expect(result.modified.totalPoints).toBe(7700);
    expect(deltas(result.scores)).toEqual([0, 7700, -7700, 0]);
    expect(result.field.hiddenScore).toBe(0);
    expect(result.field.secretRuleFired).toBe(true);
    expect(totalScore(result.scores)).toBe(INITIAL_TOTAL);
  });

  it("Case B: 人狼の和了（3900 → 7700）は公開持ち点 +7700、裏得点 +3800", () => {
    const result = settleAgari({
      scores: newTable(),
      field: createFieldScoreState("p2"),
      agari: P2_RON_FROM_P3,
      secretRuleResult: PLUS_ONE_HAN,
    });

    expect(deltas(result.scores)).toEqual([0, 7700, -7700, 0]);
    expect(result.field.hiddenScore).toBe(3800);
    expect(result.field.secretRuleFired).toBe(true);
    expect(totalScore(result.scores)).toBe(INITIAL_TOTAL);
  });

  it("人狼と一般で、和了時の公開持ち点の動きは区別できない", () => {
    const asVillager = settleAgari({
      scores: newTable(), field: createFieldScoreState("p4"), agari: P2_RON_FROM_P3, secretRuleResult: PLUS_ONE_HAN,
    });
    const asWerewolf = settleAgari({
      scores: newTable(), field: createFieldScoreState("p2"), agari: P2_RON_FROM_P3, secretRuleResult: PLUS_ONE_HAN,
    });

    expect(asWerewolf.scores).toEqual(asVillager.scores);
    expect(asWerewolf.modified).toEqual(asVillager.modified);
  });

  it("Case E: 条件不成立なら +3900、裏得点 0、未発動のまま", () => {
    const result = settleAgari({
      scores: newTable(),
      field: createFieldScoreState("p2"),
      agari: P2_RON_FROM_P3,
      secretRuleResult: SECRET_RULE_NOT_MATCHED,
    });

    expect(deltas(result.scores)).toEqual([0, 3900, -3900, 0]);
    expect(result.field.hiddenScore).toBe(0);
    expect(result.field.secretRuleFired).toBe(false);
  });

  it("仕様書の例: 人狼のダマテン +2翻（3900 → 8000）で裏得点 +4100", () => {
    const result = settleAgari({
      scores: newTable(),
      field: createFieldScoreState("p2"),
      agari: P2_RON_FROM_P3,
      secretRuleResult: PLUS_TWO_HAN,
    });

    expect(result.modified.totalPoints).toBe(8000);
    expect(result.field.hiddenScore).toBe(4100);
  });

  it("人狼の子ツモ（4000 → 7900）で裏得点 +3900、支払いは通常のツモ配分", () => {
    const result = settleAgari({
      scores: newTable(),
      field: createFieldScoreState("p2"),
      agari: { han: 3, fu: 30, winType: "TSUMO", winnerId: "p2", dealerId: "p1", playerIds: SEAT_ORDER },
      secretRuleResult: PLUS_ONE_HAN,
    });

    expect(deltas(result.scores)).toEqual([-3900, 7900, -2000, -2000]);
    expect(result.field.hiddenScore).toBe(3900);
    expect(totalScore(result.scores)).toBe(INITIAL_TOTAL);
  });

  it("同じ場で人狼が複数回和了すると裏得点が積み上がる", () => {
    const first = settleAgari({
      scores: newTable(), field: createFieldScoreState("p2"), agari: P2_RON_FROM_P3, secretRuleResult: PLUS_ONE_HAN,
    });
    const second = settleAgari({
      scores: first.scores, field: first.field, agari: P2_RON_FROM_P3, secretRuleResult: PLUS_ONE_HAN,
    });

    expect(second.field.hiddenScore).toBe(7600);
  });
});

describe("Secret Rule Sandbox: 場の終了時の精算", () => {
  /** Case B の直後の状態（人狼 p2 が裏得点 3800 を持っている）。 */
  function afterWerewolfAgari() {
    return settleAgari({
      scores: newTable(), field: createFieldScoreState("p2"), agari: P2_RON_FROM_P3, secretRuleResult: PLUS_ONE_HAN,
    });
  }

  it("Case C: 特定成功なら裏得点 3800 を没収し、下家から 1300 / 1300 / 1200 を分配", () => {
    const agari = afterWerewolfAgari();
    const result = settleFieldEnd({
      scores: agari.scores, field: agari.field, werewolfIdentified: true, seatOrder: SEAT_ORDER,
    });

    // p2 の下家は p3 → p4 → p1 の順
    expect(deltas(result.scores)).toEqual([1200, 3900, -7700 + 1300, 1300]);
    expect(result.confiscated).toBe(3800);
    expect(result.revealedHiddenScore).toBe(3800);
    expect(result.field.hiddenScore).toBe(0);
    expect(result.penaltyApplied).toBe(false);
    expect(totalScore(result.scores)).toBe(INITIAL_TOTAL);
  });

  it("Case D: 特定失敗なら公開持ち点は変わらず、裏得点はそのまま確定", () => {
    const agari = afterWerewolfAgari();
    const result = settleFieldEnd({
      scores: agari.scores, field: agari.field, werewolfIdentified: false, seatOrder: SEAT_ORDER,
    });

    expect(result.scores).toEqual(agari.scores);
    expect(deltas(result.scores)).toEqual([0, 7700, -7700, 0]);
    expect(result.confiscated).toBe(0);
    expect(result.revealedHiddenScore).toBe(3800);
    expect(result.field.hiddenScore).toBe(0);
    expect(result.transfers).toEqual([]);
  });

  it("Case F: 場で一度も発動しなければ人狼に -8000、下家から 2700 / 2700 / 2600 を分配", () => {
    const result = settleFieldEnd({
      scores: newTable(), field: createFieldScoreState("p2"), werewolfIdentified: false, seatOrder: SEAT_ORDER,
    });

    expect(deltas(result.scores)).toEqual([2600, -8000, 2700, 2700]);
    expect(result.penaltyApplied).toBe(true);
    expect(totalScore(result.scores)).toBe(INITIAL_TOTAL);
  });

  it("Case F': 条件不成立の和了しかなかった場合も未発動として減点する", () => {
    const agari = settleAgari({
      scores: newTable(), field: createFieldScoreState("p2"), agari: P2_RON_FROM_P3,
      secretRuleResult: SECRET_RULE_NOT_MATCHED,
    });
    const result = settleFieldEnd({
      scores: agari.scores, field: agari.field, werewolfIdentified: true, seatOrder: SEAT_ORDER,
    });

    expect(result.penaltyApplied).toBe(true);
    expect(result.confiscated).toBe(0);
  });

  it("Case G: 一般プレイヤーだけが発動させた場合もペナルティはない", () => {
    const agari = settleAgari({
      scores: newTable(), field: createFieldScoreState("p4"), agari: P2_RON_FROM_P3, secretRuleResult: PLUS_ONE_HAN,
    });
    const result = settleFieldEnd({
      scores: agari.scores, field: agari.field, werewolfIdentified: false, seatOrder: SEAT_ORDER,
    });

    expect(result.penaltyApplied).toBe(false);
    expect(result.scores).toEqual(agari.scores);
  });

  it("ペナルティは人狼が特定されても適用され、没収の後に行う", () => {
    const result = settleFieldEnd({
      scores: newTable(), field: createFieldScoreState("p2"), werewolfIdentified: true, seatOrder: SEAT_ORDER,
    });

    expect(result.confiscated).toBe(0);
    expect(result.penaltyApplied).toBe(true);
    expect(deltas(result.scores)).toEqual([2600, -8000, 2700, 2700]);
  });

  it("ペナルティ額は設定で変更できる", () => {
    const result = settleFieldEnd({
      scores: newTable(), field: createFieldScoreState("p2"), werewolfIdentified: false, seatOrder: SEAT_ORDER,
      unfiredPenaltyPoints: 3900,
    });

    expect(deltas(result.scores)).toEqual([1300, -3900, 1300, 1300]);
  });

  it("裏得点の精算方式は Strategy で差し替えられる", () => {
    const agari = afterWerewolfAgari();
    const result = settleFieldEnd({
      scores: agari.scores, field: agari.field, werewolfIdentified: true, seatOrder: SEAT_ORDER,
      hiddenScoreStrategy: { settle: ({ scores }) => ({ scores, confiscated: 0, transfers: [] }) },
    });

    expect(result.scores).toEqual(agari.scores);
    expect(result.confiscated).toBe(0);
  });

  it("人狼の最終的な損得は v1 のパターンAと同じ（成功 +3900 / 失敗 +7700）", () => {
    const agari = afterWerewolfAgari();
    const identified = settleFieldEnd({
      scores: agari.scores, field: agari.field, werewolfIdentified: true, seatOrder: SEAT_ORDER,
    });
    const notIdentified = settleFieldEnd({
      scores: agari.scores, field: agari.field, werewolfIdentified: false, seatOrder: SEAT_ORDER,
    });

    expect((identified.scores.get("p2") ?? 0) - INITIAL_SCORE).toBe(3900);
    expect((notIdentified.scores.get("p2") ?? 0) - INITIAL_SCORE).toBe(7700);
  });
});
