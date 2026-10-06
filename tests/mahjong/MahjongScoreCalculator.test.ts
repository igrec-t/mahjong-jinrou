import { describe, expect, it } from "vitest";
import { calculateAgari, calculateBasicPoints } from "../../src/mahjong/MahjongScoreCalculator.js";

const PLAYERS = ["p1", "p2", "p3", "p4"] as const;
const DEALER = "p1";

describe("calculateBasicPoints", () => {
  it.each([
    [1, 30, 240],
    [3, 30, 960],
    [4, 30, 1920],
    [4, 40, 2000], // 2560 → 満貫で頭打ち
    [5, 30, 2000],
    [6, 30, 3000],
    [8, 30, 4000],
    [11, 30, 6000],
    [13, 30, 8000],
  ])("%i翻%i符 → 基本点 %i", (han, fu, expected) => {
    expect(calculateBasicPoints(han, fu)).toBe(expected);
  });

  it("不正な翻数・符はエラーにする", () => {
    expect(() => calculateBasicPoints(0, 30)).toThrow(RangeError);
    expect(() => calculateBasicPoints(1.5, 30)).toThrow(RangeError);
    expect(() => calculateBasicPoints(1, 10)).toThrow(RangeError);
  });
});

describe("calculateAgari", () => {
  it.each([
    [1, 30, 1000],
    [3, 30, 3900],
    [4, 30, 7700],
    [5, 30, 8000],
    [6, 30, 12000],
  ])("子のロン %i翻%i符 = %i点", (han, fu, expected) => {
    const result = calculateAgari({
      han, fu, winType: "RON", winnerId: "p2", loserId: "p3", dealerId: DEALER, playerIds: PLAYERS,
    });
    expect(result.totalPoints).toBe(expected);
    expect(result.payments).toEqual([{ payerId: "p3", receiverId: "p2", amount: expected }]);
  });

  it("親のロン 3翻30符 = 5800点", () => {
    const result = calculateAgari({
      han: 3, fu: 30, winType: "RON", winnerId: DEALER, loserId: "p3", dealerId: DEALER, playerIds: PLAYERS,
    });
    expect(result.totalPoints).toBe(5800);
  });

  it("子のツモ 3翻30符 = 1000/2000（計4000点）", () => {
    const result = calculateAgari({
      han: 3, fu: 30, winType: "TSUMO", winnerId: "p2", dealerId: DEALER, playerIds: PLAYERS,
    });
    expect(result.payments).toEqual([
      { payerId: "p1", receiverId: "p2", amount: 2000 },
      { payerId: "p3", receiverId: "p2", amount: 1000 },
      { payerId: "p4", receiverId: "p2", amount: 1000 },
    ]);
    expect(result.totalPoints).toBe(4000);
  });

  it("親のツモ 3翻30符 = 2000オール（計6000点）", () => {
    const result = calculateAgari({
      han: 3, fu: 30, winType: "TSUMO", winnerId: DEALER, dealerId: DEALER, playerIds: PLAYERS,
    });
    expect(result.payments.map((p) => p.amount)).toEqual([2000, 2000, 2000]);
    expect(result.totalPoints).toBe(6000);
  });

  it("ADD_HAN の修正が翻数に加算される", () => {
    const result = calculateAgari({
      han: 3, fu: 30, winType: "RON", winnerId: "p2", loserId: "p3", dealerId: DEALER, playerIds: PLAYERS,
      modifiers: [{ type: "ADD_HAN", value: 1 }],
    });
    expect(result.han).toBe(4);
    expect(result.totalPoints).toBe(7700);
  });

  it("不正な ADD_HAN はエラーにする", () => {
    expect(() =>
      calculateAgari({
        han: 3, fu: 30, winType: "RON", winnerId: "p2", loserId: "p3", dealerId: DEALER, playerIds: PLAYERS,
        modifiers: [{ type: "ADD_HAN", value: 0 }],
      }),
    ).toThrow(RangeError);
  });

  it("和了者と放銃者が同じならエラーにする", () => {
    expect(() =>
      calculateAgari({
        han: 1, fu: 30, winType: "RON", winnerId: "p2", loserId: "p2", dealerId: DEALER, playerIds: PLAYERS,
      }),
    ).toThrow();
  });

  it("卓にいないプレイヤーが関わる和了はエラーにする", () => {
    expect(() =>
      calculateAgari({
        han: 1, fu: 30, winType: "RON", winnerId: "p2", loserId: "x9", dealerId: DEALER, playerIds: PLAYERS,
      }),
    ).toThrow();
  });
});
