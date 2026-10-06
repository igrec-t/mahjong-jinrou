import type { ScoreModifier } from "../mahjong/ScoreModifier.js";

/**
 * 秘密ルールの評価結果。サーバー内部専用で、クライアントへは絶対に送らない。
 * ルール定義・レジストリ・各ルールのハンドラーは Phase 8 で追加する。
 */
export interface SecretRuleResult {
  readonly matched: boolean;
  readonly modifiers: readonly ScoreModifier[];
}

export const SECRET_RULE_NOT_MATCHED: SecretRuleResult = { matched: false, modifiers: [] };
