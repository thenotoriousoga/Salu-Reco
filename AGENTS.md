# AGENTS.md — Salu-Rec

## プロジェクト概要

フットサルの試合管理・MVP選出を行うWebアプリ。Google Apps Script（GAS）で完結し、スマホブラウザから利用できる。
全データはイベント単位で管理され、イベントを横断した集計は行わない。

### ロール（権限モデル）

- **管理者**: パスワード認証（スクリプトプロパティ `ADMIN_PASSWORD`）。全機能にアクセス可能
- **一般ユーザー**: イベントコード（4桁英数字）で参加。試合管理・閲覧が可能、イベント作成・メンバー管理・MVP選出は不可
- Webアプリは「全員」に公開し、アプリ内でロールを制御する（GASのセッション管理は使わない）
- UI出し分けはクライアントサイドの `currentRole` 変数と CSSクラス（`.admin-only` / `.user-only`）で制御

## 技術スタック

| レイヤー | 技術 |
|---|---|
| ランタイム | Google Apps Script（V8ランタイム） |
| バックエンド | GAS サーバーサイド関数（`.gs` ファイル × 8） |
| フロントエンド | HTML + CSS + Vanilla JS（GASテンプレート `HtmlService`） |
| データストア | Google スプレッドシート（8シート） |
| アンケート | Google フォーム（`FormApp` で自動生成） |
| デプロイ | `@google/clasp` + GitHub Actions（`master` ブランチ push 時に自動デプロイ） |
| フォント | Fira Sans（本文）/ Fira Code（データ表示） |
| デザイン | Vibrant & Block-based スタイル、SVGアイコン、スマホファースト |

## ディレクトリ構成

```
.
├── AGENTS.md                  ← このファイル
├── README.md                  プロジェクト説明・セットアップ手順
├── .clasp.json                clasp設定（scriptId, rootDir）※ .gitignore対象
├── .github/
│   └── workflows/
│       └── deploy.yml         GitHub Actions: masterへのpush時にclasp pushで自動デプロイ
├── .kiro/
│   ├── steering/              AIエージェント向けステアリングルール
│   └── skills/                AIエージェント向けスキル定義
├── docs/
│   ├── er-diagram.md          ER図（Mermaid記法、テーブル定義・リレーション詳細）
│   ├── mvp-logic.md           MVP選出ロジック詳細（定量・定性評価、正規化、順位付け）
│   └── design-system.md       デザインシステム（カラー、タイポグラフィ、コンポーネント、アクセシビリティ）
└── src/                       GASプロジェクトのソースコード（clasp rootDir）
    ├── appsscript.json        GASプロジェクト設定（タイムゾーン: Asia/Tokyo, webapp設定）
    ├── Code.gs                共通処理（スプレッドシート取得、シート初期化、ユーティリティ関数）
    ├── Auth.gs                認証・ロール管理（管理者パスワード認証、イベントコード認証）
    ├── Events.gs              イベントCRUD（作成・取得・更新・削除）
    ├── Gemini.gs              Gemini API連携（プロンプト送信・レスポンス取得）
    ├── Members.gs             メンバーCRUD（イベントに紐づく、一括登録対応）
    ├── Mvp.gs                 MVP選出ロジック（Gemini AI総合評価、0〜100点）
    ├── Rounds.gs              ラウンド・マッチ管理、スコア・得点記録
    ├── Survey.gs              Googleフォーム自動生成、アンケート回答取得
    ├── TeamSplit.gs           チーム分けロジック（経験者・未経験者シャッフル均等配分）
    ├── index.html             メインHTML（SPA構成、タブ切り替え）
    ├── css.html               スタイルシート（CSS変数ベースのデザインシステム）
    ├── js.html                クライアントサイドJS・コア（状態管理、ユーティリティ、ページ遷移）
    ├── js-auth.html           クライアントサイドJS・認証（ログイン・ロール管理、セッション管理）
    ├── js-events.html         クライアントサイドJS・イベント管理（一覧・詳細表示）
    ├── js-members.html        クライアントサイドJS・メンバー管理（キュー方式の登録・編集・削除）
    ├── js-rounds.html         クライアントサイドJS・試合管理（チーム分けUI、ラウンド・マッチ操作、タイマー）
    └── js-results.html        クライアントサイドJS・結果表示（成績集計、アンケート、MVP選出）
```

## アーキテクチャ

### サーバーサイド（GAS）

- `Code.gs` が共通基盤。`getSpreadsheet_()` でスプレッドシートを取得し、`getSheetData_()` でシートデータをオブジェクト配列に変換する
- プライベート関数は末尾 `_` の命名規則（GASの慣例で、クライアントから直接呼び出せない）
- 公開関数（`_` なし）は `google.script.run` 経由でクライアントから呼び出される
- スプレッドシートIDはスクリプトプロパティ `SPREADSHEET_ID` から取得

### クライアントサイド（js.html）

- SPA風の画面遷移（`showPage()` でページ切り替え、`switchTab()` でタブ切り替え）
- `callServer()` ラッパーでサーバー呼び出しを統一（ローディング表示・エラーハンドリング込み）
- 状態はグローバル変数で管理（`currentEventId`, `currentMembers`, `cachedRounds`, `currentRole` など）
- メンバー登録はキュー方式（`memberQueue` に追加 → `bulkAddMembersFromQueue` で一括登録）
- ロール別UI出し分け: `isAdmin()` 関数でJS内の条件分岐、CSSクラス `body.role-user .admin-only { display: none }` でHTML要素の表示制御
- ログイン画面（`page-login`）で管理者パスワード or イベントコードを入力し、`setRole_()` でロールを設定

### データモデル（スプレッドシート8シート）

```
イベント ──┬── メンバー
           ├── ラウンド（チーム分けの単位） ── マッチ（2チーム対戦） ──┬── マッチメンバー
           │                                                          └── 得点
           ├── アンケート回答
           └── MVP結果
```

- 全てのデータはイベントIDで紐づく
- マッチはラウンドIDで紐づく
- マッチメンバー・得点はマッチIDで紐づく
- IDは `Utilities.getUuid().substring(0, 8)` で生成（8文字のUUID先頭部分）
- 各テーブルのカラム定義・リレーション・カスケード削除の詳細は [ER図](docs/er-diagram.md) を参照

## コーディング規約

### GAS（サーバーサイド）

- `var` を使用（GAS V8ランタイムだが、既存コードに合わせる）
- プライベート関数は `functionName_()` の命名（末尾アンダースコア）
- 定数は `UPPER_SNAKE_CASE_` + 末尾アンダースコア（例: `SHEET_HEADERS_`）
- シート名・カラム名は日本語（例: `'イベント'`, `'メンバーID'`）
- 関数にはJSDoc形式のコメントを付与
- `Array.prototype.forEach` / `map` / `filter` を使用（for-ofは使わない）
- エラー時は `{ success: false, message: '...' }` 形式で返す

### フロントエンド（js.html）

- Vanilla JS のみ（フレームワーク・ライブラリ不使用）
- `google.script.run` でサーバー関数を呼び出し
- HTML生成は文字列結合（テンプレートリテラルは使わず `+` 演算子で結合）
- XSS対策として `esc()` 関数でエスケープ
- SVGアイコンは `svg()` ヘルパー + `IC` オブジェクトで管理

### CSS（css.html）

- CSS変数（`--primary`, `--bg`, `--radius` など）でデザイントークンを管理
- BEM風ではなく、シンプルなクラス名（`.card`, `.btn-primary`, `.team-a` など）
- スマホファースト設計（`max-width: 600px` のコンテナ）
- `@media (prefers-reduced-motion)` でアニメーション配慮
- カラーパレット・タイポグラフィ・コンポーネント仕様の詳細は [デザインシステム](docs/design-system.md) を参照

## ビルド・デプロイ

### ローカル開発

```bash
# claspのインストール（グローバル）
npm install -g @google/clasp

# GASプロジェクトにpush
clasp push

# GASプロジェクトからpull
clasp pull
```

- ローカルビルドステップは不要（GASが直接 `.gs` / `.html` を実行する）
- テストフレームワークは未導入

### CI/CD（GitHub Actions）

- `master` ブランチへの push 時、`src/` 配下に変更があれば `clasp push --force` で自動デプロイ
- シークレット: `CLASPRC_JSON`（clasp認証情報）、`SCRIPT_ID`（GASスクリプトID）

## 主要なビジネスロジック

### チーム分け（TeamSplit.gs）

- 経験者と未経験者をそれぞれFisher-Yatesシャッフルし、ラウンドロビンでNチームに均等配分
- 既存チーム考慮モード: 既にチームにメンバーがいる場合、未割当メンバーを同じロジックで配分
- 最低4人以上が必要
- チーム数は2〜最大（人数÷3）まで設定可能（1チーム最低3人）
- チーム分けはNチーム対応だが、試合（マッチ）は常に2チーム対戦
- 3チーム以上の場合、ユーザーが対戦カード（どの2チームが戦うか）を選択して試合を作成する

### MVP選出（Mvp.gs）

Gemini AIによる総合評価で0〜100点の採点を行う。
詳細は [MVP選出ロジック](docs/mvp-logic.md) を参照。

- 試合データ（得点・勝利・出場数）、メンバー情報（経験・年次・備考・幹事）、アンケートコメントを全てAIに渡す
- AIが総合的に0〜100点で採点し、MVP/準MVPの順位と評価コメントを一括で返す
- 得点が多い＝MVPではなく、場の雰囲気への貢献やチームメイトからの評価を重視
- MVP/準MVP人数は選出時に指定（各1〜5人）
- ラウンドに出場したメンバーのみが選出対象
- 全メンバーにレーティング（0.0〜10.0）と評価コメントを付与
- **MVP選出は「試合終了」ステータスでのみ実行可能**（ステータスの自動変更は行わない）

### イベントステータス遷移（Events.gs）

イベントは4つのステータスを持ち、管理者の操作で遷移する。

```
準備中 ──→ 進行中 ⇄ 試合終了 ──→ 完了
```

| ステータス | 意味 | 可能な操作 |
|---|---|---|
| **準備中** | イベント作成直後 | メンバー登録、アンケート作成 |
| **進行中** | ラウンド・試合が行われている | ラウンド作成、マッチ操作、メンバー編集 |
| **試合終了** | 全ラウンド・全マッチが終了 | MVP選出、アンケート回答 |
| **完了** | イベント確定 | 閲覧のみ（全変更ロック） |

#### 遷移条件

| 遷移 | トリガー | 条件 |
|---|---|---|
| 準備中 → 進行中 | ラウンド作成時（自動） | なし |
| 進行中 → 試合終了 | 「イベント終了」ボタン | 全ラウンド・全マッチが「終了」 |
| 試合終了 → 進行中 | 「進行中に戻す」ボタン | なし |
| 試合終了 → 完了 | 「完了にする」ボタン | なし（MVP未選出でも可） |

#### 完了時の処理

- Googleフォームの回答受付を停止（`FormApp.setAcceptingResponses(false)`）
- 全ての編集操作がUIから非表示になる

## 変更時の注意事項

- シート名・カラム名を変更する場合は `SHEET_HEADERS_`（Code.gs）と全ファイルの参照箇所を同時に更新すること
- 公開関数を追加した場合、クライアント側の `google.script.run.関数名()` 呼び出しも追加すること
- CSSの色やサイズを変更する場合は `:root` のCSS変数を変更すること（ハードコードされた値は避ける）
- `clasp push` 前に GAS エディタ上で他の人が編集していないか確認すること（`--force` で上書きされる）
- Google フォーム関連の機能（Survey.gs）はGASの `FormApp` スコープが必要。初回実行時に権限承認が求められる
- 管理者限定の機能を追加する場合は、HTML要素に `admin-only` クラスを付与するか、JS内で `isAdmin()` で条件分岐すること
- 一般ユーザーに非表示にする要素は `admin-only` クラス、管理者に非表示にする要素は `user-only` クラスを使用
- 管理者パスワードはスクリプトプロパティ `ADMIN_PASSWORD` に手動で設定する
