# 麻雀人狼 AIコーディング マスタープロンプト v2

Node.js / TypeScript / React / Socket.IO / Claude Code / GitHub Actions / Azure

この文書を開発の **Source of Truth** とする。既存コードと矛盾する場合は、この文書を勝手に書き換えずに矛盾点を報告すること。
v1（初版マスタープロンプト）に、2026-10-06 の確認結果を反映した統合版である。v1 から変えた箇所には【変更】、新たに加えた箇所には【追加】を付けている。

---

## 確定事項一覧（2026-10-06）

| # | 項目 | 決定内容 | 該当章 |
|---|---|---|---|
| 1 | 和了結果の表示 | 人狼・一般とも同じ形式で「通常役一覧＋最終点数（秘密ルール込み）」を表示する。注記はしない。点数のずれは推理材料として許容する | 7.4 |
| 2 | 精算方式 | 【変更】表示どおりに精算する。人狼の差分は「裏得点（没収リスク分）」として内部で記録する | 7 |
| 3 | 没収した裏得点 | 他の3人へ均等に分配する | 9.6 |
| 4 | 秘密ルール未発動ペナルティ | 【追加】場ごとに判定する。一度も発動しなければ人狼に -8000 点。減点分は他の3人へ均等に分配する | 8 |
| 5 | DAMATEN_BONUS | 門前・リーチなしでの和了（ロン・ツモ両方） | 6.5 |
| 6 | 自分への投票 | 不可 | 9.3 |
| 7 | 裏得点額の公開 | Reveal 時に公開する | 9.5 |
| 8 | アシスト機能 | 【追加】牌効率にもとづき、捨てるとよい牌の上位3つを表示する | 13 |
| 9 | CI の時期 | 【変更】CI（lint/typecheck/test/build）を Phase 2 の直後に前倒しする。デプロイは Phase 19 のまま | 21 |
| 10 | Azure | App Service（Linux）＋ **Publish Profile** 認証 | 2.4 |
| 11 | 通信 | Socket.IO を採用する | 14 |
| 12 | CPU 設定の型 | `cpuConfig: CpuConfig` を採用する（`cpuLevel?` は使わない） | 11 |
| 13 | 秘密ルールの作用範囲 | 【追加】点数にのみ作用する。和了できるか・行動できるかの判定には影響させない | 6.3 |
| 14 | ルール予想の選択肢 | 【追加】全ルールプールから出す。人狼に提示した3候補は使わない | 9.4 |
| 15 | タイミングによる漏洩対策 | 【追加】秘密ルール選択フェーズは「全員の確認操作」と「最低待機時間」の両方がそろうまで終わらない | 10.5 |

---

## 0. あなたの役割

あなたは Node.js、TypeScript、React、WebSocket/Socket.IO、オンラインゲームサーバー設計、麻雀ロジック、正体隠匿ゲーム設計、CPU/Bot AI、Git/GitHub/GitHub Actions、Microsoft Azure、Claude Code、テスト自動化、セキュリティ、Server Authoritative Architecture、CI/CD に精通したシニアフルスタックエンジニア兼ゲームエンジニア兼ゲームデザイナーである。

4人対戦ゲーム「麻雀人狼」を開発する。単に動くコードではなく、次を重視する。
ゲームルールの整合性、秘密情報の保護、オンライン同期、CPU 対応、CPU の個別難易度、拡張性、テスト容易性、保守性、セキュリティ、Azure への安全な自動デプロイ、AI コーディングで変更しやすい構造。

---

## 1. 開発環境制約（最重要）

### 1.1 許可される新規インストール
`npm install` のみ許可する（`npm install`、`npm install <pkg>`、`npm install -D <pkg>`）。

### 1.2 禁止
`npm ci`、pip/pip3、apt/apt-get、brew、winget、choco、cargo install、gem install、`curl ... | sh`、exe/msi/pkg/dmg、OS パッケージマネージャー、別ランタイムの追加、Docker・WSL・Azure CLI・GitHub CLI・Python の新規導入。その他、OS や開発環境へ新しいソフトウェアを入れる操作も禁止する。

### 1.3 実現手段
使ってよいのは、(1) 既にインストール済みの環境、(2) Node.js 標準機能、(3) `npm install` で導入できるパッケージ、だけである。
npm パッケージを追加するときは、追加理由を説明したうえで package.json に反映する。
制約内で実現できない場合は、勝手に別の手段を使わず、「実現できない理由 / 必要になるもの / npm install のみで実現できる代替案」を提示する。

### 1.4 確認済みの環境（2026-10-06）
Node.js v24.18.0、npm 11.16.0、git 2.55.0。az / gh / docker は未導入（導入しない）。GitHub と Azure の設定はブラウザ（GitHub Web、Azure Portal）で行う。

---

## 2. 開発・デプロイ

### 2.1 フロー
VS Code → Claude Code で実装 → npm でローカルテスト → git diff 確認 → commit → push → GitHub Actions（install / lint / typecheck / test / build）→ Azure へデプロイ。
ローカルから Azure へ直接手動でデプロイすることは基本としない。

### 2.2 GitHub Actions
- 各ステップは `npm install` → `npm run lint` → `npm run typecheck` → `npm run test` → `npm run build`。**npm ci は使わない**。
- どれか1つでも失敗したら Azure へデプロイしない（deploy ジョブは `needs: ci`）。
- デプロイは main への push のときだけ行う。本番依存は CI 上で `npm install --omit=dev` を使って用意し、ビルド済み成果物をデプロイする（Azure 側のビルドは使わない）。
- package-lock.json はコミットする。

### 2.3 シークレット管理
Azure 認証情報、接続文字列、秘密鍵、API Key、パスワードをソースコードに書かない。GitHub Actions Secrets、Azure Application Settings、環境変数を使う。

### 2.4 Azure【確定】
- Azure App Service（Linux、Node LTS）を使う。Node のバージョンは App Service が対応しているものに合わせ、package.json の `engines` と CI の `node-version` をそろえる。
- 必要な設定：Web Sockets ON、ARR Affinity ON、インスタンス1台（ルーム状態をメモリに持つため）、B1 以上を推奨。
- 認証は **Publish Profile 方式**。発行プロファイルを GitHub Secret `AZURE_WEBAPP_PUBLISH_PROFILE` に登録する（SCM の Basic 認証を有効にする必要がある）。
- App Settings：`NODE_ENV=production`、`SHOW_SECRET_DEBUG_INFO=false`。
- デプロイが失敗したときは、CLI 等を勝手に導入せず、Actions ログ、Secrets、Azure 設定、環境変数、Node のバージョン、ビルド、依存関係を調べる。

### 2.5 ブランチ
main（デプロイ対象）/ develop / feature/*。MVP 初期は複雑にしすぎないが、大規模な変更をいきなり main に入れない。

---

## 3. CLAUDE.md

プロジェクトルートの CLAUDE.md に、絶対ルール20項目と作業ルールを記載済み。この文書と CLAUDE.md の両方に従う。

---

## 4. ゲーム概要・コンセプト

- ゲーム名は「麻雀人狼」。ジャンルは麻雀 × 正体隠匿 × 推理。基本は4人打ちリーチ麻雀。
- 東場・南場それぞれに「人狼1名」と「秘密の特殊ルール1個」を設定する。
- 中心となる問いは「なぜそのプレイヤーは、その打ち方をしたのか？」。人狼だけが秘密ルールを知っている。ルールを狙いすぎると打ち筋に違和感が出る（ダマテン、赤牌への執着、不自然な鳴き、特定の牌の温存など）。一般プレイヤーはその違和感から推理する。
- 一般プレイヤーも、意図的に不自然な打ち方をしてブラフをかけてよい。システム側で一般プレイヤーの行動を制限しない。

---

## 5. 半荘構成と人狼抽選

- 構成：東1〜東4局 → 人狼確認フェーズ → 南1〜南4局 → 人狼確認フェーズ → 最終結果。MVP では連荘なしで、各場4局に固定する。連荘は将来対応。
- 人狼の抽選は東場開始時と南場開始時に、**4人全員**（CPU を含む）から1人を選ぶ。前の場の人狼も候補から外さない（連続人狼を許可）。
- 抽選と山の生成はサーバー側で `crypto.randomInt()` を使う。クライアントの `Math.random()` に頼らない。
- テストとシミュレーションのために乱数は注入可能にする（`Rng` インターフェース。本番は crypto、テストはシード付き PRNG を自作）。

---

## 6. 秘密ルール

### 6.1 全員に作用する
秘密ルールは人狼専用の能力ではない。**4人全員に作用する**。違いは、人狼だけがそれを事前に知っていることである。

### 6.2 発動を通知しない
- 「特殊ルール発動！」、Secret Rule Activated、Bonus Han、Secret Bonus、Hidden Rule Triggered、「特殊ルール +1翻」のような表示やイベントを出さない。
- 光る、特殊SE、特殊アニメーション、文字色の変更、専用アイコン、画面揺れも禁止する。
- プレイヤーは、麻雀の結果と他プレイヤーの行動だけから推理する。

### 6.3 【追加】点数にのみ作用する
- 秘密ルールで加わる翻やドラは、ドラと同じく**1翻縛りを満たさない**。
- 和了できるか、行動できるか、クライアントへ送る選択可能アクションの一覧は、すべて**秘密ルールなし**で判定する。
- 理由：アクションが受理されるか拒否されるかの違いから秘密ルールが漏れるのを防ぐため。

### 6.4 候補の提示と選択
各場の開始時に、人狼にだけ候補3つを提示し、人狼が1つを選ぶ。一般プレイヤーには、候補・選ばれたルール・カテゴリ・発動状況を一切送らない。

### 6.5 初期ルール
| ID | 内容 | 効果 |
|---|---|---|
| RED_TILE_BONUS | 赤牌を含んで和了 | +1翻 |
| DAMATEN_BONUS | 【確定】門前・リーチなしで和了（ロン・ツモ両方） | +2翻 |
| OPEN_HAND_BONUS | 副露している状態で和了 | +1翻 |
| THREE_CALL_BONUS | 3副露以上で和了 | +2翻 |
| EXTENDED_DORA | ドラ表示牌から、通常のドラに加えてその次の牌もドラとして扱う | Dora Modifier（ADD_HAN ではない） |

### 6.6 データ構造
```ts
type SecretRuleCategory = "TILE" | "ACTION" | "SCORING" | "DORA" | "DECLARATION" | "OTHER";

interface SecretRuleDefinition {         // データとして持つ（JSON・設定に置ける）
  id: SecretRuleId; name: string; description: string;
  category: SecretRuleCategory; handler: string; params: RuleParams;
}
type ScoreModifier =
  | { type: "ADD_HAN"; value: number }
  | { type: "EXTRA_DORA"; indicatorOffsets: number[] };
interface SecretRuleResult { matched: boolean; modifiers: ScoreModifier[] } // サーバー内部専用

SecretRuleRegistry.register("RED_TILE_BONUS", redTileBonusHandler);
```
ルールはハードコードしすぎず、データ（定義）とハンドラーに分ける。判定は和了者の役割に依存させない。

---

## 7. 得点処理【変更】

### 7.1 方針：表示どおりに精算する
- 和了は、和了者が人狼か一般かに関係なく、**秘密ルール込みの点数（modifiedResult）で通常どおり精算する**。ロン・ツモの支払い構造は通常の麻雀と同じ。
- 和了者が人狼の場合だけ、差分 `modified - base` を内部の **裏得点（没収リスク分）** に加算する。この分は人狼の公開持ち点に**すでに含まれている**。
- その結果、対局中の点数移動は人狼と一般で区別できず、点数の合計も常に保たれる。
- v1 のパターンA（人狼は通常分だけを即時獲得し、差分は保留）から変更した。理由：表示を統一すると、パターンAでは「表示点数と実際の点数移動のずれ」から人狼が確定してしまうため。人狼の最終的な損得はパターンAと同じになる。

### 7.2 例：人狼ロン（通常 3900 → 秘密ルール込み 7700）
| タイミング | 全員に見えるもの | 内部（人狼本人にだけ見える） |
|---|---|---|
| 和了時 | 放銃者 -7700 / 人狼 +7700 | 裏得点 +3800 |
| 場の終了・特定成功 | 人狼 -3800、他の3人に +1300 / +1300 / +1200 | 裏得点 → 0 |
| 場の終了・特定失敗 | 変化なし（確定） | 裏得点 → 0 |

一般プレイヤーが同じ和了をした場合：放銃者 -7700、和了者 +7700、裏得点なし。

### 7.3 モジュールと処理の流れ
`MahjongScoreCalculator` / `SecretRuleEngine` / `HiddenScoreCalculator` / `ScoreSettlementService` に分ける。

```ts
const baseResult = mahjongScoreCalculator.calculate(agariContext);
const secretResult = secretRuleEngine.evaluate({ rule: field.secretRule, context: agariContext });
const modifiedResult = mahjongScoreCalculator.calculate({ ...agariContext, modifiers: secretResult.modifiers });

scoreSettlementService.settle(modifiedResult.payments);      // 全員共通
if (secretResult.matched) field.secretRuleFired = true;      // 未発動ペナルティの判定用（勝者が誰でも）
if (winner.id === field.werewolfPlayerId) {
  field.hiddenScore += modifiedResult.totalPoints - baseResult.totalPoints;
}
```
- 支払いは `ScorePayment { payerId; receiverId; amount }` の単位で扱う。MVP では裏得点を和了者の総獲得点の差分として扱う。
- 場の終了時の精算は `HiddenScoreSettlementStrategy` として差し替え可能にする。MVP は「没収分を他の3人へ均等分配」。将来、システム加算・供託・チップ方式などに変えられるようにする。

### 7.4 和了結果の表示【確定】
- 人狼・一般とも同じ形式：**通常役の一覧（秘密ルールなしで計算）＋最終点数（秘密ルール込み）**。注記はしない。
- 役の合計と点数が合わないことがあっても許容する。ずれが意図的かどうかは見た人には分からず、それが推理材料になる。
- 送信データに `specialRuleMatched`、`bonusHan`、秘密ルール由来の翻数などのフィールドを含めない。

### 7.5 均等分配の端数（仮決定）
100点単位で分ける。端数の100点は、人狼の下家から席順に1本ずつ配る（例：3800 → 1300 / 1300 / 1200、8000 → 2700 / 2700 / 2600）。点数の合計は常に保たれる。

---

## 8. 秘密ルール未発動ペナルティ【追加】

- 目的：秘密ルールが一度も発動しないまま場が終わるのを防ぐ。
- 判定は場（東場・南場）ごと。その場の和了のうち、**誰か1人でも**秘密ルールが成立した和了があれば「発動済み」とする（和了者は人狼でなくてもよい）。
- 一度も発動しなかった場合、人狼に **-8000 点**。減点分は他の3人へ均等に分配する（端数は 7.5 に従う）。
- 人狼が特定されたかどうかに関係なく適用する。適用は Reveal 後の精算フェーズで行う。
- 減点額は設定値（`unfiredPenaltyPoints`）として変更可能にする。
- 発動したかどうかは Reveal 前に誰にも送らない（人狼本人にも、`secretRuleFired` は Reveal まで送らない）。

---

## 9. 人狼確認フェーズ

各場の終了後に、議論 → 人狼投票 → 秘密ルール予想 → 投票確定 → 人狼の公開 → 秘密ルールの公開 → 精算（裏得点・未発動ペナルティ）の順で進める。

### 9.1 議論
MVP は「議論してください」という画面と「準備完了」ボタンだけ。将来はテキストチャット、ボイスチャット、スタンプ、牌譜閲覧へ拡張できる構造にする。

### 9.2 投票の非公開
全員の投票が終わるまで、他人の投票内容を送らない（送るのは「誰が投票済みか」だけ）。

### 9.3 人狼投票【確定】
4人全員が投票する。人狼本人も投票する。**自分には投票できない**（自分以外の3人から選ぶ）。

### 9.4 秘密ルール予想
投票の後、各プレイヤーが今回の秘密ルールを予想する。選択式で、**選択肢は全ルールプール**から出す。結果は `SecretRuleGuessResult { playerId; guessedRuleId; correct }` として記録する。正解時の報酬は未定のため、初期値は 0 点とする。

### 9.5 Reveal【確定】
全員に、人狼、秘密ルール、投票結果、予想結果、**裏得点の額**、未発動ペナルティの有無を公開する。

### 9.6 判定と精算
- `VoteResolutionStrategy.resolve(votes): VoteResult` として差し替え可能にする。
- MVP の判定：
  - 人狼が単独で最多票 → **特定成功**：裏得点を全額没収し、他の3人へ均等分配。それ以外の通常得点は減らさない。
  - 別のプレイヤーが最多票、または最多票が同数で複数 → **特定失敗**：裏得点はすでに持ち点に含まれているので、そのまま確定する。
- どちらの場合も、最後に `hiddenScore = 0` とする。

---

## 10. アーキテクチャと秘密情報保護

### 10.1 Server Authoritative
- 正しいゲーム状態は Node.js サーバーだけが持つ。クライアントは Action（打牌・鳴き・リーチ・和了・投票など）だけを送る。
- クライアントから score / role / playerId / hiddenScore / secretRule / 牌の所有などの確定値を受け取って信用しない。
- 例：打牌は `{ "tileId": "5m-3" }` だけを送る。playerId はサーバーが Session から決める。

### 10.2 GameState（サーバー内部）
```ts
interface GameState {
  roomId: string; phase: GamePhase; players: PlayerState[];
  windField: WindFieldState | null;   // 場ごとの秘密状態
  round: RoundState | null;           // 現在の局（山・王牌・手牌・ドラ表示牌・手番など）
  fieldHistory: RevealedFieldRecord[];
  publicLog: PublicLogEntry[];
}
interface WindFieldState {
  wind: "EAST" | "SOUTH"; werewolfPlayerId: PlayerId;
  ruleCandidates: SecretRuleId[]; secretRuleId: SecretRuleId | null;
  hiddenScore: number; secretRuleFired: boolean;
  votes: Map<PlayerId, PlayerId>; guesses: Map<PlayerId, SecretRuleId>;
}
```
GameState をそのままクライアントへ送ってはいけない。

### 10.3 PlayerView
- クライアントへ送るデータは必ず `createPlayerView(gameState, viewerPlayerId)` で作る。
- 組み立てはホワイトリスト方式で行い、GameState をスプレッドしない。
- 人狼本人のときだけ `self.werewolf = { secretRule, hiddenScore, candidates? }` を付ける。
- Reveal 前の一般プレイヤーのデータには `werewolfPlayerId` / `secretRule` / `hiddenScore` / `specialRuleMatched` / `bonusHan` / `secretRuleFired` を **null としても含めない**（フィールド自体を作らない）。`exactOptionalPropertyTypes` を有効にして型でも防ぐ。
- 「あなたは一般プレイヤーです」という表示は可。

### 10.4 送信
- ブラウザの DevTools で通信を見られても分からない構造にする。`display: none` で隠すだけでは不十分で、最初から送らない。
- 送信の窓口は2つに限る。`broadcastPublic(PublicEvent)`（型で公開情報だけに制限）と、`sendToPlayer(playerId, PlayerView)`。
- Reveal 前に `werewolf:selected`、`secret-rule:activated`、`hidden-score:changed`、`special-rule:matched` のようなイベントを送らない。

### 10.5 タイミングによる漏洩対策【追加】
- 秘密ルール選択フェーズは、**全員の役職確認操作（人狼はルール選択）**と**最低待機時間（仮：8秒）**の両方がそろうまで終わらない。
- CPU の人狼も乱数の遅延を入れて選ぶ。
- 理由：フェーズが終わるまでの時間から人狼を推測されないようにするため。

---

## 11. ルーム・プレイヤー

- 1ルーム4席。機能はルーム作成、参加、Ready、CPU の追加・削除・レベル変更、ゲーム開始。
- 空いている席に CPU を1人ずつ追加できる。4席を超えて追加しない。ゲーム開始前なら CPU を削除できる（CPU → 空席）。
- Human と CPU は自由に組み合わせられる（HHHH、HHHC、HHCC、HCCC）。将来は CCCC にも対応する（テスト・バランス検証用）。
- 1人プレイの例：Human + CPU Lv1 + CPU Lv3 + CPU Lv5 で半荘を開始できる。

```ts
type PlayerControllerType = "HUMAN" | "CPU";
interface CpuConfig { level: CpuLevel }
type PlayerState = { id: PlayerId; name: string; seat: Seat; score: number }
  & ({ controllerType: "HUMAN"; sessionId: SessionId }
   | { controllerType: "CPU"; cpuConfig: CpuConfig });
```
- 手牌と副露は局ごとの `PlayerHandState` に分ける。
- Player / Session / SocketConnection を分け、playerId と socketId を同一視しない。将来、切断後に同じ Player として再接続できるようにする。

---

## 12. CPU

### 12.1 レベル
- CPU ごとに個別のレベルを設定する（全員共通ではない）。
- MVP は5段階：1 初心者 / 2 初級 / 3 中級（標準） / 4 上級 / 5 高難度。
- レベルの定義は `CPU_DIFFICULTY_TABLE` の1か所にまとめ、`type CpuLevel = keyof typeof CPU_DIFFICULTY_TABLE` とする。zod スキーマも UI もここから作り、レベルの追加はエントリ1つで済むようにする。

### 12.2 パラメータ中心の設計
- Lv ごとに別のプログラムを書かない。「共通アルゴリズム＋レベル別パラメータ」で差を作る。
- 単純な乱数の大小だけで強さを決めない。
```ts
interface CpuDifficultyConfig {
  level: CpuLevel;
  tileEfficiencyWeight: number; defenseWeight: number; scoreWeight: number;
  randomness: number; riskTolerance: number;
  werewolfInferenceWeight: number; secretRuleInferenceWeight: number; bluffWeight: number;
  secretRuleExploitWeight: number; stealthWeight: number;
}
```

| パラメータ | Lv1 | Lv2 | Lv3 | Lv4 | Lv5 |
|---|---|---|---|---|---|
| tileEfficiencyWeight | 0.3 | 0.6 | 0.9 | 1.0 | 1.0 |
| defenseWeight | 0 | 0.2 | 0.5 | 0.8 | 1.0 |
| scoreWeight | 0 | 0.2 | 0.5 | 0.7 | 0.9 |
| randomness | 0.6 | 0.35 | 0.15 | 0.08 | 0.03 |
| riskTolerance | 0.9 | 0.7 | 0.5 | 0.45 | 0.4 |
| werewolfInferenceWeight | 0 | 0.3 | 0.6 | 0.8 | 1.0 |
| secretRuleInferenceWeight | 0 | 0.2 | 0.5 | 0.8 | 1.0 |
| bluffWeight | 0 | 0 | 0.2 | 0.5 | 0.8 |
| secretRuleExploitWeight | 1.0 | 0.9 | 0.7 | 0.6 | 状況で変える |
| stealthWeight | 0 | 0.1 | 0.4 | 0.7 | 1.0 |

（値は初期案。シミュレーションで調整する）

打牌評価：`w_eff·効率 + w_def·安全度 + w_score·打点 + (人狼なら exploit·ルール利益 − stealth·不自然さ) + randomness·ノイズ`

各レベルの目安：
- Lv1：ランダム性が高い、最低限の和了判断、危険牌判断が弱い、推理はほぼランダム
- Lv2：簡単なシャンテン数判断、テンパイを目指す、ドラを多少評価、明らかな危険牌を多少避ける、簡易的な人狼推理
- Lv3：牌効率、受け入れ枚数、簡単な押し引き、打点、ドラ・赤、リーチ判断、他家リーチの警戒、不自然な行動からの推理
- Lv4：守備、河の情報、副露判断、場況、点数状況、秘密ルール候補の分析を組み合わせて評価
- Lv5：期待値、放銃リスク、相手のモデル化、候補ルールごとの尤度比較、意図的なブラフ、裏得点のリスク管理（MVP では完全実装しなくてよい）

### 12.3 Human と CPU は共通の Action を使う
- Human：入力 → GameAction → GameEngine。CPU：CpuDecisionEngine → GameAction → **同じ** GameEngine.dispatch。
- CPU 専用の裏口で状態を変えない。
- `CpuDecisionEngine` は独立したモジュールにして、差し替えられるようにする。

### 12.4 情報制限（チート禁止）
- CPU が受け取るのは `createCpuView(gameState, cpuPlayerId)` だけ。中身は PlayerView と公開ログで、人間のクライアントと同じ情報である。
- Lv5 でも、他人の手牌、未来の山、人狼 ID、秘密ルール、他人の非公開投票、他人の裏得点を参照しない。強さは公開情報の分析能力で作る。
- CPU が人狼の場合だけ、自分が人狼であること・秘密ルール・自分の裏得点を参照できる（人間の人狼と同じ）。
- `src/cpu/` からはサーバー内部のモジュールを import しない（ESLint で強制）。

### 12.5 推理
- 観測データとして、不自然なダマテン、副露頻度、赤牌への執着、特定の牌への執着、牌効率から外れた捨て牌、急なプレイスタイルの変化を記録する。
- `SuspicionScore { targetPlayerId; score }` を CPU 内部に持つ。真の人狼 ID は参照しない。
- 【追加】点数のずれ（役の合計と最終点数が合わない和了）も観測データとして使ってよい。これは公開情報である。
- 秘密ルールの推理：Lv1 ほぼランダム / Lv2 簡単な結果比較 / Lv3 複数局の比較 / Lv4 得点と行動の分析 / Lv5 候補ごとの尤度比較。

### 12.6 CPU が人狼のとき
- ルール選択：Lv1 ランダム / Lv3 自分の基本の打ち方との相性 / Lv5 期待される裏得点、バレやすさ、通常の麻雀への悪影響、順位。
- 【追加】未発動ペナルティ（-8000）を避けるため、場の残り局数に応じて秘密ルールを満たしにいく度合いを上げる。
- 打ち方：Lv1 は単純にルールを狙う。Lv3 はある程度バレないよう調整する。Lv5 は裏得点の期待値、通常得点、疑われ度、場況、順位、残り局数を考える。
- 投票：自分以外へ投票する。高レベルほど疑いをそらす戦略を取る。

### 12.7 思考時間とシミュレーション
- AI の思考処理と演出用の待ち時間は分ける。`CPU_THINK_DELAY=0` でテスト用の高速モードにする。
- 将来、`npm run simulate` で「CPU Lv1 × 4 で 1000 半荘」のような自動対局を行い、ルール別の期待値、平均裏得点、人狼発見率、人狼勝率、レベル別成績、ルールバランス、未発動率を分析する。

---

## 13. アシスト機能【追加】

麻雀初心者向けに、自分の打牌選択時に**捨てるとよい有力な牌を上位3つ**表示する。

- **対象**：人間プレイヤー。プレイヤーごとに ON/OFF でき、初期値は ON（仮決定）。他のプレイヤーには使っているかどうかを送らない。
- **表示**：手牌の該当する牌に 1 / 2 / 3 の順位バッジを付ける。各候補について、打牌後のシャンテン数と有効牌（種類・残り枚数）を示す。
- **評価（牌効率のみ）**：
  1. 打牌後のシャンテン数が小さい順
  2. 受け入れ枚数が多い順（**自分から見えている牌**を引いた残り枚数で数える）
  3. 同点の場合は、孤立した字牌 → 端牌 → 中張牌の順に優先する簡易タイブレーク
- **情報制約**：本人の PlayerView にある情報だけで計算する。山や他人の手牌は見ない。**秘密ルールは考慮しない**（人狼でも同じアルゴリズムを使う）。
- **実装場所**：牌効率の計算は `src/mahjong/efficiency/` に置き、CPU の効率評価と共用する。サーバーの `DiscardAssistService` が計算し、`PlayerView.assist`（本人の分だけ）に入れて送る。React Component にロジックを書かない。
- **表示しない場面**：リーチ後（ツモ切りしかないため）、自分の手番以外。リーチ宣言時の打牌選択では表示する。
- この表示は推奨にすぎず、プレイヤーの行動を制限しない。

---

## 14. GamePhase / GameAction / 通信

```ts
type GamePhase = "WAITING" | "WEREWOLF_SELECTION" | "SECRET_RULE_SELECTION" | "PLAYING"
  | "DISCUSSION" | "WEREWOLF_VOTING" | "SECRET_RULE_GUESS" | "REVEAL"
  | "HIDDEN_SCORE_SETTLEMENT" | "NEXT_ROUND" | "FINISHED";

type GameAction =
  | { type: "DISCARD"; tileId: string } | { type: "RIICHI"; tileId: string }
  | { type: "CHI" | "PON"; tileIds: [string, string] }
  | { type: "KAN"; kind: "ANKAN" | "MINKAN" | "KAKAN"; tileIds: string[] }
  | { type: "RON" } | { type: "TSUMO" } | { type: "PASS" }
  | { type: "SELECT_SECRET_RULE"; ruleId: SecretRuleId } | { type: "CONFIRM_ROLE" }
  | { type: "PHASE_READY" } | { type: "VOTE_WEREWOLF"; targetPlayerId: PlayerId }
  | { type: "GUESS_SECRET_RULE"; ruleId: SecretRuleId };

GameEngine.dispatch(actorId: PlayerId, action: GameAction): GameActionResult;
type GameActionResult = { success: true } | { success: false; errorCode: string; message: string };
```
- フェーズごとに許可する Action を `PHASE_ALLOWED_ACTIONS` で限定する。局の結果表示は PLAYING 内のサブ状態で扱う。
- **Client → Server**：room:create / room:join / room:leave / room:add-cpu / room:remove-cpu / room:set-cpu-level / room:start / player:ready / player:set-assist / session:resume / game:discard / game:chi / game:pon / game:kan / game:riichi / game:ron / game:tsumo / game:pass / role:confirm / werewolf:select-secret-rule / vote:werewolf / vote:secret-rule / phase:ready。戻り値は ack の `GameActionResult`。
- **Server → Client**：room:state / game:state（PlayerView 全体を個別送信）/ game:agari / phase:changed / vote:result / round:result。MVP は Action のたびに PlayerView 全体を送り直す方式にする。

---

## 15. 検証・エラー・再接続

- クライアントからの入力はすべて zod で検証する。
- 打牌の検証：手番か、その牌を持っているか、PLAYING フェーズか、リーチ後の制約に違反していないか、すでに行動済みでないか。
- ルール違反でサーバーを落とさず、`GameActionResult` で失敗を返す。エラーを握り潰さない。

---

## 16. ログ・デバッグ

- Server Debug Log と Public Game Log を分ける。人狼・秘密ルール・裏得点・発動有無は Public Game Log に絶対に含めない。
- 秘密情報を含むデバッグ出力は `SHOW_SECRET_DEBUG_INFO=true` かつ `NODE_ENV !== "production"` のときだけ出す。本番では必ず無効にする。ブラウザ Console に秘密情報を出さない。

---

## 17. モジュールとディレクトリ

推奨モジュール：MahjongEngine、MahjongScoreCalculator、SecretRuleEngine、SecretRuleRegistry、HiddenScoreCalculator、ScoreSettlementService、HiddenScoreSettlementStrategy、UnfiredRulePenaltyService【追加】、WerewolfManager、VotingService、RoundManager、GameStateManager、GamePhaseManager、CpuDecisionEngine、CpuSecretRuleSelector、CpuWerewolfInference、DiscardAssistService【追加】。

```
src/
  shared/      # クライアントとサーバーの共通部分。公開してよい型だけを置く
  schemas/socketSchemas.ts
  server/      app.ts websocket.ts
  rooms/       Room.ts RoomManager.ts
  game/        Game.ts GameState.ts GameStateManager.ts GameAction.ts
  mahjong/     MahjongEngine.ts MahjongScoreCalculator.ts Tile.ts Hand.ts Meld.ts efficiency/
  werewolf/    WerewolfManager.ts
  secretRules/ SecretRule.ts SecretRuleEngine.ts SecretRuleRegistry.ts rules/*.ts
  cpu/         CpuDecisionEngine.ts CpuDifficultyConfig.ts CpuPlayerController.ts
               CpuSecretRuleSelector.ts CpuWerewolfInference.ts
  scoring/     HiddenScoreCalculator.ts ScoreSettlementService.ts UnfiredRulePenaltyService.ts
  assist/      DiscardAssistService.ts
  voting/      VotingService.ts VoteResolutionStrategy.ts
  phases/      GamePhase.ts GamePhaseManager.ts
  views/       createPlayerView.ts createCpuView.ts
  client/      # React（shared/ 以外は import 禁止）
  sandbox/     # Secret Rule / Room / CPU Sandbox
tests/
```
import の境界は ESLint `no-restricted-imports` で強制する。
- client → shared のみ
- cpu → shared と cpu のみ
- 秘密情報を外に出す出口は views/ だけ

---

## 18. 技術スタック・画面

- **TypeScript**：strict ＋ `noUncheckedIndexedAccess` ＋ `exactOptionalPropertyTypes`。any で型エラーを回避しない。
- **package.json scripts**：dev / build / start / lint / typecheck / test / test:watch（後で simulate を追加）。
- **予定している依存**：
  - 本番：socket.io、socket.io-client、express、zod、react、react-dom
  - 開発：typescript、@types/*、vite、@vitejs/plugin-react、tsx、concurrently、vitest、eslint、@eslint/js、typescript-eslint、eslint-plugin-react-hooks
  - 麻雀の点数計算は自作する（Modifier を差し込む必要があるため）。インターフェースにして差し替え可能にする。
- **React の責務**：表示、ユーザー入力、WebSocket 通信だけ。ゲームルール、得点計算、人狼の決定を Component に書かない。
- **画面**：タイトル、ルーム作成、ルーム参加、待機室（CPU の追加・削除・レベル設定）、役職確認、秘密ルール選択、麻雀卓（アシスト表示を含む）、議論、人狼投票、秘密ルール予想、結果発表、最終順位。
- **人狼 UI**：「あなたは人狼です」、秘密ルール、現在の裏得点を、「秘密情報を表示」ボタンを押している間だけ表示する、といった形にできる。

---

## 19. テスト計画

### 19.1 Secret Rule Sandbox【変更】
| Case | 役割 | Base | Modified | 公開持ち点の変化 | 裏得点 |
|---|---|---|---|---|---|
| A | 一般 | 3900 | 7700 | +7700 | 0 |
| B | 人狼 | 3900 | 7700 | +7700 | +3800 |
| C | 人狼・特定成功の精算 | — | — | -3800（他の3人へ +1300 / +1300 / +1200） | 0 |
| D | 人狼・特定失敗の精算 | — | — | 変化なし | 0 |
| E | 条件不成立 | 3900 | 3900 | +3900 | 0 |
| F | 場で一度も発動しない | — | — | 人狼 -8000（他の3人へ +2700 / +2700 / +2600） | — |
| G | 一般プレイヤーだけが発動させた | — | — | ペナルティなし | — |

この Sandbox のテストが通るまで、本格的な麻雀 UI の実装へ進まない。

### 19.2 Unit Test
- 人狼抽選：4人から1人が選ばれる、前の場の人狼も再び選ばれうる、CPU も選ばれる
- 秘密ルール：候補3つの生成、1つの選択、一般プレイヤーにも効果がある、5ルールそれぞれの成立・不成立、秘密ルールの翻だけでは和了できない
- 投票：単独最多が人狼なら没収・分配、別のプレイヤーが最多なら確定、同票なら特定失敗、自分への投票は拒否
- ルーム・CPU：追加、削除、4席の上限、CPU ごとに別のレベル、Lv1/3/5 の同時利用
- 行動検証：手番外、持っていない牌、フェーズ外、リーチ後の手変わりを拒否する
- アシスト：既知の手牌で期待どおりの上位3つが出る、山・他人の手牌を参照しない、秘密ルールで結果が変わらない、リーチ後は表示しない
- CPU Sandbox：同じ公開状態に対して Lv1/3/5 が異なるパラメータで評価する

### 19.3 情報漏洩テスト（最重要）
- Reveal 前の各フェーズで、一般プレイヤーの PlayerView を `JSON.stringify` した結果に次が含まれないこと：
  - `werewolfPlayerId` / `secretRule` / `hiddenScore` / `specialRuleMatched` / `bonusHan` / `secretRuleFired`
  - 選ばれたルールの ID と名前、3候補の ID
- 人狼の和了と一般の和了で、送信データの形が同じであること。
- 送信層：禁止イベント名が出ないこと、PlayerView の宛先が本人だけであること。
- CpuView にも同じ検査を行い、さらに他人の手牌と山が含まれないこと。
- CPU 4人の対局で、状態が変わるたびに人狼以外3人の View を検査する。

### 19.4 CPU 4人回帰テスト
- 構成：CPU Lv1 / Lv2 / Lv3 / Lv5、シード付き乱数、`CPU_THINK_DELAY=0`。
- 人間の入力なしで半荘の最後（FINISHED）まで進む。
- 確認すること（不変条件）：
  - 上限アクション数以内に終わる
  - 常に牌の総数が136枚
  - **点数の合計が常に保たれる**（7章の方式により）
  - 各場の人狼がちょうど1人
  - CPU の Action が一度も拒否されない
- CI では20シード、`npm run simulate` では大量に回す。

---

## 20. 作業ルール

- 作業開始時に確認するもの：CLAUDE.md、この文書、package.json、tsconfig.json、ディレクトリ構造、既存テスト、git status、git diff。
- 各タスクで示すもの：今回の目的 / 現状 / 変更ファイル / 設計意図 / 実装 / テスト / テスト結果 / 残課題 / 次のステップ。
- 一度に巨大な変更をしない。小さく実装 → テスト → 確認 → 次へ。
- 仕様が曖昧な点は「未確定事項 / 現在の仮実装 / 理由 / 代替案 A・B・C」で整理する。小さな不明点は、単純で差し替え可能な仮実装で進める。
- **禁止事項**：npm install 以外の新規インストール、npm ci、仕様確認なしの全面書き換え、秘密情報のクライアント送信、CPU による非公開情報の参照、クライアント側での得点確定・人狼決定、テストを削除して成功扱いにすること、any による安易な回避、空の catch によるエラー握り潰し、GitHub Actions を迂回した本番デプロイ。
- **最初から作り込まないもの**：豪華な UI、高度な CPU Lv5、ボイスチャット、ランキング、課金、アカウント、大量の特殊ルール、複雑なエフェクト。

---

## 21. MVP 開発順序【変更】

1. プロジェクト確認（完了）
2. Secret Rule Sandbox（19.1 の Case A〜G）
2.5. 【前倒し】GitHub Actions の CI（lint / typecheck / test / build。デプロイなし）
3. GameState と PublicGameState / PlayerView の分離
4. Room（4席、Human / CPU）
5. CPU（追加・削除・個別レベル）
6. Human / CPU 共通の GameAction
7. 簡易麻雀（配牌・ツモ・打牌・ロン・ツモ和了）
8. 秘密ルールエンジン
9. 裏得点・未発動ペナルティ
10. CPU Lv1〜Lv3 の基本麻雀 ＋ アシスト機能（牌効率モジュールを共用）
11. 人狼確認フェーズ
12. 人狼投票
13. CPU の人狼推理
14. 秘密ルールの推理
15. 東場 → 南場
16. 半荘終了処理
17. CPU Lv4〜Lv5 の拡張
18. GitHub Actions のデプロイジョブ
19. Azure へのデプロイ（App Service ＋ Publish Profile）
20. CPU 自動シミュレーション

---

## 22. ゲームの核心と優先順位

最優先で正しく動かすもの：
- 秘密ルールは全員に作用する
- 人狼だけがルールを知っている
- 発動を通知しない
- 和了は表示どおりに精算する
- 人狼の差分は裏得点（没収リスク分）になる
- 場の終了時に人狼投票を行い、当てられれば没収して分配、当てられなければ確定する
- 一度も発動しなければ人狼にペナルティ

優先順位：1. 正しいゲームルール、2. 秘密情報の保護、3. テスト可能性、4. Human / CPU 共通の設計、5. CPU の個別難易度、6. オンライン同期、7. 保守性、8. Azure 自動デプロイ、9. UI の品質、10. 高度な AI。

このゲームは**情報の非対称性**で成り立つ。秘密ルールは全員に作用するが、知っているのは人狼だけである。知識を使うほど打ち筋に違和感が出て、一般プレイヤーはそこから推理する。一般プレイヤーもブラフをかけられる。CPU も人間と同じ情報制約の中で、麻雀、推理、ブラフを行う。

---

## 23. 残っている仮決定（実装を止めずに進め、後で見直す）

| 項目 | 仮決定 | 差し替えポイント |
|---|---|---|
| 均等分配の端数 | 100点単位。端数は人狼の下家から席順に配る | HiddenScoreSettlementStrategy |
| 秘密ルール選択フェーズの最低待機時間 | 8秒 | 設定値 |
| アシストの初期値 | ON | プレイヤー設定 |
| 秘密ルール予想の正解報酬 | 0点 | 設定値 |
| 流局・本場・立直棒 | 流局ありで、各場4局固定（連荘なし）。立直棒は供託し、次の和了者が獲得する。半荘終了時に残った供託はトップが獲得する | RoundManager |
| 持ち点がマイナスになった場合（飛び） | 終了せずに続行する | 設定値 |
