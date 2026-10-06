import type { PlayerId } from "./ids.js";

/** m=萬子 p=筒子 s=索子 z=字牌（1〜4=東南西北, 5〜7=白發中）。 */
export type TileSuit = "m" | "p" | "s" | "z";

export interface Tile {
  /** 牌ごとに一意（例："5m-0"）。 */
  readonly id: string;
  readonly suit: TileSuit;
  readonly rank: number;
  readonly red: boolean;
}

export type MeldType = "CHI" | "PON" | "MINKAN" | "ANKAN" | "KAKAN";

export interface Meld {
  readonly type: MeldType;
  readonly tiles: readonly Tile[];
  /** 鳴いた相手（暗槓のときはなし）。 */
  readonly calledFrom?: PlayerId;
}

export interface Discard {
  readonly tile: Tile;
  /** ツモ切りか（推理の材料になる公開情報）。 */
  readonly tsumogiri: boolean;
  /** リーチ宣言牌か。 */
  readonly riichiDeclaration: boolean;
  /** 他家に鳴かれたか。 */
  readonly called: boolean;
}
