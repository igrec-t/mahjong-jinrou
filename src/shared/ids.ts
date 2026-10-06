/** プレイヤーの識別子。socketId とは別物（master-prompt 11）。 */
export type PlayerId = string;

/** 再接続用のセッション識別子。資格情報なので本人以外へ送らない。 */
export type SessionId = string;

/** 秘密ルールの識別子（例："DAMATEN_BONUS"）。 */
export type SecretRuleId = string;

/** 席番号。0 から手番順に並ぶ。 */
export type Seat = 0 | 1 | 2 | 3;

/** 場（東場・南場）。 */
export type Wind = "EAST" | "SOUTH";
