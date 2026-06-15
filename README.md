# 2026 W杯 応援ドラフト｜生存ボード（自動更新・サブスク版）

毎日 **9:00 / 17:00（JST）** に **Claude Code（Sonnet）** がスケジュール実行され、
Web 検索で確定した試合結果を調べて `data.json` を更新 → コミット → **GitHub Pages** で全員に公開します。
**従量課金（API）は使いません。** Claude の **サブスク（Pro/Max）** 枠で動かします。

```
リポジトリ/
├─ index.html              ← 盤面（data.json を読み込んで描画。自動更新では触らない）
├─ data.json               ← 唯一の更新対象（Sonnet と手動編集のみが書き換える）
├─ CLAUDE.md               ← 自動更新タスクの手順・ガードレール
├─ scripts/validate.mjs    ← 構造を固定する検証（API 不使用）。NG なら公開しない
└─ .claude/
   ├─ settings.json        ← 必要ツールの自動許可 ＋ 書き込みガードのフック
   └─ hooks/guard.mjs      ← data.json 以外への書き込みを物理ブロック
```

**安全設計（3重）：** (1) CLAUDE.md で「data.json だけ」を指示 → (2) PreToolUse フックが他ファイル編集を拒否 →
(3) validate.mjs が 48か国の group/seed と 8人のロスターを固定チェック（構造が変わったら push 中止）。
さらに公開時は `git add data.json` のみ。Sonnet は「スコアと status と日付」しか動かせません。

---

## なぜ GitHub Actions ではないのか（重要）

GitHub Actions から Claude を呼ぶには **API キーが必要＝従量課金**になります。
さらに **`claude -p`（ヘッドレス）も OAuth を使えず API キー必須**で、必ず従量課金です
（環境変数 `ANTHROPIC_API_KEY` が設定されていると、サブスクではなく API に課金されます）。
Anthropic 公式も、サブスク勢のスケジュール実行は **Claude Code のスケジュールタスク**を案内しています。

---

## セットアップ

### 1. リポジトリ & 公開
1. このフォルダ一式を GitHub の新規リポジトリ（例 `wc2026-board`）の `main` に push。
2. Settings → Pages → Source: **Deploy from a branch** → `main` / `/(root)` → Save。
   数分後 `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開。この URL を 8 人に共有。

### 2. サブスク認証（従量課金を避ける肝）
- ターミナルで `claude /login` し、**Pro/Max のアカウント**でログイン。
- **`ANTHROPIC_API_KEY` を環境から外す**（`unset ANTHROPIC_API_KEY` / Windows はユーザー環境変数を削除）。
  これが残っていると API に課金されます。
- `claude` 内で `/status` を実行し、認証が **Subscription / OAuth**（API key ではない）になっていることを確認。
- `/model sonnet` でモデルを Sonnet に。

### 3. スケジュール登録（どちらか）

**A. Claude Code on the Web（推奨・クラウド・PC不要）**
Web 版は常にサブスク認証で動きます。GitHub リポジトリを接続し、
`claude.ai/code/scheduled`（またはセッション内 `/schedule`）で **2つのタスク** を作成：
- 実行時刻：**9:00 JST** と **17:00 JST**（cron なら `0 0 * * *` と `0 8 * * *` ＝UTC）
- モデル：**Sonnet**
- プロンプト：下記「実行プロンプト」

**B. Claude Code デスクトップ（ローカル）**
デスクトップアプリの **Scheduled Tasks** で同様に 9:00 / 17:00・Sonnet・下記プロンプトを登録。
※ この方式は **実行時刻にアプリ（PC）が起動している必要** があります。

### 4. 実行プロンプト（タスクに貼る）
```
CLAUDE.md の手順に従って、本日分のW杯スコア更新を実行して。
終了した試合だけ data.json に反映し、node scripts/validate.mjs を通してから、
変更があれば data.json のみを commit して push して。検証に失敗したら revert して push しないで。
```

---

## 運用メモ
- **モデル**：Sonnet。サブスク枠を消費（従量課金なし）。1日2回・少量なので Pro/Max の上限にはまず当たりません。
- **手動修正**：`data.json` を直接編集して push すれば即反映。Sonnet 判定を上書きできます。
- **ノックアウト（R32〜）**：`matches` に `"g":"R32"` 等で自動追加されます。進出/敗退の確定は status に反映。
- **検証の役割**：構造（国の group/seed・8人のロスター）が1つでも変わると validate.mjs が落ち、公開は止まります。

## 注意点
- **デスクトップ方式は PC が起動していないとスキップ** されます（次回または手動で取り込み）。常時動かしたいなら Web 方式を。
- スケジュール実行は数分ずれることがあります。Pages も CDN キャッシュで反映に数分。
- 初回はツール許可のプロンプトが出ることがあります（.claude/settings.json で主要操作は許可済み。必要なら `/permissions` で追加）。
- `index.html` をローカル（file://）で開くと埋め込みスナップショット（6/13時点）を表示。最新は Pages の URL で。

## やってはいけないこと（課金事故防止）
- `claude -p` や `--bare` をスケジュールに使わない（API キー必須＝従量課金）。
- `ANTHROPIC_API_KEY` をタスクの環境に設定しない。`/status` で常に Subscription を確認。
