import { describe, expect, it } from "vitest";
import {
  createEvenTransfersToOthers,
  distributeEvenly,
  othersFromShimocha,
} from "../../src/scoring/distribution.js";

const SEAT_ORDER = ["p1", "p2", "p3", "p4"] as const;

describe("othersFromShimocha", () => {
  it("本人を除き、下家から席順に並べる", () => {
    expect(othersFromShimocha(SEAT_ORDER, "p1")).toEqual(["p2", "p3", "p4"]);
    expect(othersFromShimocha(SEAT_ORDER, "p3")).toEqual(["p4", "p1", "p2"]);
  });

  it("席にいないプレイヤーはエラーにする", () => {
    expect(() => othersFromShimocha(SEAT_ORDER, "x9")).toThrow();
  });
});

describe("distributeEvenly", () => {
  it.each([
    [3800, [1300, 1300, 1200]],
    [8000, [2700, 2700, 2600]],
    [3900, [1300, 1300, 1300]],
    [0, [0, 0, 0]],
  ])("%i点を3人に分ける", (amount, expected) => {
    expect(distributeEvenly(amount, ["a", "b", "c"])).toEqual(expected);
  });

  it("100点単位でない額や負の額はエラーにする", () => {
    expect(() => distributeEvenly(150, ["a", "b", "c"])).toThrow(RangeError);
    expect(() => distributeEvenly(-100, ["a", "b", "c"])).toThrow(RangeError);
  });

  it("分配先がいなければエラーにする", () => {
    expect(() => distributeEvenly(100, [])).toThrow();
  });
});

describe("createEvenTransfersToOthers", () => {
  it("端数は支払者の下家から配り、0点の支払いは作らない", () => {
    expect(createEvenTransfersToOthers("p2", 200, SEAT_ORDER)).toEqual([
      { payerId: "p2", receiverId: "p3", amount: 100 },
      { payerId: "p2", receiverId: "p4", amount: 100 },
    ]);
  });
});
