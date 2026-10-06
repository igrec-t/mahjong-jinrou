# Project Rules

Project: 麻雀人狼（麻雀 × 正体隠匿 × 推理、4人打ちリーチ麻雀）

Stack: Node.js / TypeScript / React / WebSocket (Socket.IO)

開発フロー: VS Code → Claude Code → Git → GitHub → GitHub Actions → Azure

仕様の Source of Truth: [docs/master-prompt.md](docs/master-prompt.md)（矛盾を見つけたら書き換えずに報告する）

## Absolute Rules

1. 新規インストール操作は `npm install` のみ許可する
2. `npm ci` を使用しない（GitHub Actions 内も同様）
3. pip / apt / brew / winget / choco / cargo / gem / `curl | sh` / exe・msi 等を使用しない。Docker・WSL・Azure CLI・GitHub CLI・Python も新規導入しない
4. TypeScript strict mode を使用する
5. any を極力使用しない
6. Server Authoritative Architecture を採用する
7. 人狼情報を一般プレイヤーへ送信しない
8. 秘密ルールを一般プレイヤーへ送信しない
9. 裏得点を一般プレイヤーへ送信しない
10. 特殊ルール発動通知を送信しない（表示・SE・演出・色変化も禁止）
11. ゲームロジックを React Component へ記述しない
12. CPU に非公開情報を参照させない
13. Human と CPU は共通 GameAction を利用する
14. CPU ごとに個別レベル設定を可能にする
15. Azure への本番デプロイは GitHub Actions 経由とする
16. テスト失敗状態では Azure へデプロイしない
17. 仕様を勝手に大きく変更しない
18. 既存コードを確認してから変更する
19. テストを削除して成功扱いにしない
20. エラーを握り潰さない
21. すべての作業を無料の範囲で行う（Azure は App Service Free F1、有料の SaaS やプランを使わない）。無料で実現できない場合は、理由・必要な費用・無料の代替案を提示する

## 環境制約で実現できない場合

勝手に別手段でインストールせず、次を提示する：
- 現在の制約では実現できない理由
- 必要になるもの
- `npm install` のみで実現可能な代替案

npm パッケージを追加する場合は、追加理由を説明したうえで package.json に反映する。

## 秘密情報の設計原則

- クライアント送信データは必ず `createPlayerView(state, viewerId)` を通す。GameState をスプレッドせず、許可フィールドを列挙して組み立てる（ホワイトリスト方式）
- Reveal 前の一般プレイヤー向けデータには `werewolfPlayerId` / `secretRule` / `hiddenScore` / `specialRuleMatched` / `bonusHan` / `secretRuleFired` を null でも含めない（フィールド自体を作らない）
- 和了は人狼・一般とも秘密ルール込みの点数で精算し、表示も同じ形式にする。人狼の差分は内部の「裏得点（没収リスク分）」として記録するだけにする（master-prompt 7章）
- 秘密ルールは**点数のみ**に作用する。和了可否・行動可否（役なし判定、選択可能アクション一覧など）には影響させない（受理・拒否の差から漏れるため）
- 秘密ルール予想の選択肢は、人狼に提示した3候補ではなく全ルールプールから出す
- フェーズ遷移のタイミングで人狼が推測できないようにする（全員の確認操作待ち＋最低待機時間）
- 重要な乱数（人狼抽選・山の生成）はサーバー側で `crypto.randomInt()` を使う。テストやシミュレーションでは乱数を注入できるようにする
- 秘密情報を含むデバッグログは `SHOW_SECRET_DEBUG_INFO=true` かつ本番以外の場合のみ出力する。ブラウザ Console には出力しない

## CPU の設計原則

- CPU は `createCpuView(state, cpuId)` だけを受け取り、`GameAction` を返す。GameState を直接参照・変更しない
- `src/cpu/` からサーバー内部モジュール（game/、rooms/、secretRules/ など）を import しない
- 強さの差は「共通アルゴリズム＋レベル別パラメータ（CpuDifficultyConfig）」で作る
- AI の思考処理と演出用の待ち時間（`CPU_THINK_DELAY`）は分離する

## 作業ルール

作業開始時に確認するもの：CLAUDE.md、package.json、tsconfig.json、ディレクトリ構造、既存テスト、git status、git diff

各タスクで次を示す：
1. 今回の目的 2. 現状 3. 変更ファイル 4. 設計意図 5. 実装 6. テスト 7. テスト結果 8. 残課題 9. 次のステップ

- 一度に巨大な変更を行わない。小さく実装 → テスト → 確認 → 次へ
- 仕様が曖昧な点は「未確定事項 / 仮実装 / 理由 / 代替案」で整理する。小さな不明点は単純で差し替え可能な仮実装で進める
- 既存コードと仕様書が矛盾する場合は、仕様書を書き換えずに矛盾点を報告する
- ブランチ：main（デプロイ対象）/ develop / feature/*。大規模変更をいきなり main へ入れない
