import type { Tile, TileSuit } from "../shared/mahjongTypes.js";

const SUIT_RANKS: readonly (readonly [TileSuit, number])[] = [
  ["m", 9],
  ["p", 9],
  ["s", 9],
  ["z", 7],
];

const COPIES_PER_KIND = 4;

/**
 * 136枚の牌を並び順どおりに作る（シャッフルはしない）。
 * 赤牌は 5m・5p・5s の各1枚（copy 0）。
 */
export function createTileSet(): Tile[] {
  const tiles: Tile[] = [];
  for (const [suit, maxRank] of SUIT_RANKS) {
    for (let rank = 1; rank <= maxRank; rank++) {
      for (let copy = 0; copy < COPIES_PER_KIND; copy++) {
        const red = suit !== "z" && rank === 5 && copy === 0;
        tiles.push({ id: `${rank}${suit}-${copy}`, suit, rank, red });
      }
    }
  }
  return tiles;
}
