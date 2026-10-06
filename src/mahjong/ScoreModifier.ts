/**
 * 点数計算に差し込む修正。秘密ルールの評価結果として渡されるが、
 * 計算器側は「誰のどのルールによるものか」を知らない。
 *
 * EXTRA_DORA（EXTENDED_DORA 用）は牌モデルが入る Phase 8 で追加する。
 */
export type ScoreModifier = { readonly type: "ADD_HAN"; readonly value: number };

/** 修正による追加翻数の合計。 */
export function sumAdditionalHan(modifiers: readonly ScoreModifier[]): number {
  let total = 0;
  for (const modifier of modifiers) {
    if (!Number.isInteger(modifier.value) || modifier.value < 1) {
      throw new RangeError(`ADD_HAN の値は1以上の整数である必要があります: ${modifier.value}`);
    }
    total += modifier.value;
  }
  return total;
}
