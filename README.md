# Futsal Manager

15人でのフットサルの試合管理・MVP選出を行うWebアプリです。  
Google Apps Script（GAS）で完結し、スマホブラウザから利用できます。

## 機能

### イベント実施前
- **メンバー登録** - 名前、年次（社会人歴）、サッカー経験の有無、幹事フラグを管理

### 当日（フットサル中）
- **チーム分け** - AI自動分け（経験・年次を考慮したバランス分け）またはランダム分け
- **複数ラウンド対応** - 第1試合、第2試合...と何回でもチーム分け・試合を追加可能
- **試合結果管理** - スコア・得点者をリアルタイム記録

### 試合後
- **アンケート** - Googleフォームを自動生成。各メンバーへのコメントを収集（MVP名は記載しない）
- **MVP選出** - 定量評価（得点数・勝敗・経験補正・年次補正）+ 定性評価（アンケートコメント分析）でAIが選出
- **MVP/準MVP** - 人数は設定可能

## セットアップ手順

### 1. Google スプレッドシートを作成

1. [Google スプレッドシート](https://sheets.google.com) で新しいスプレッドシートを作成
2. 「拡張機能」→「Apps Script」を開く

### 2. ファイルをコピー

Apps Script エディタで以下のファイルを作成し、`src/` フォルダ内の内容をコピーしてください：

| Apps Script 上のファイル名 | コピー元 |
|---|---|
| `Code.gs` | `src/Code.gs` |
| `Members.gs` | `src/Members.gs` |
| `Events.gs` | `src/Events.gs` |
| `Rounds.gs` | `src/Rounds.gs` |
| `Survey.gs` | `src/Survey.gs` |
| `Mvp.gs` | `src/Mvp.gs` |
| `Stats.gs` | `src/Stats.gs` |
| `index.html` | `src/index.html` |
| `css.html` | `src/css.html` |
| `js.html` | `src/js.html` |

### 3. シートを初期化

Apps Script エディタで：
1. `Code.gs` を開く
2. 関数セレクタで `initializeSheets` を選択
3. ▶ 実行ボタンをクリック
4. 初回は権限の承認が求められるので許可する

### 4. Webアプリとしてデプロイ

1. 「デプロイ」→「新しいデプロイ」
2. 種類：「ウェブアプリ」を選択
3. 設定：
   - 説明：フットサル管理システム
   - 次のユーザーとして実行：**自分**
   - アクセスできるユーザー：**全員**（友達がアクセスできるように）
4. 「デプロイ」をクリック
5. 表示されたURLをコピーして友達に共有

## 使い方

### 全体の流れ

1. **メンバー登録**（事前）- 15人の名前・年次・サッカー経験・幹事フラグを登録
2. **イベント作成**（当日）- 日付と名称を入力してイベントを作成
3. **チーム分け** - 参加者を選択 → AI分け or ランダム分け → 試合開始
4. **試合記録** - 得点者ボタンで得点を記録（スコアは自動計算）
5. **試合終了** - 次のラウンドを追加するか、全試合終了へ
6. **アンケート**（試合後）- フォームを自動生成 → URLを共有 → 回答を取得
7. **MVP選出** - 定量+定性評価でAIが選出 → 結果発表

### AI チーム分けのロジック

サッカー経験者と未経験者、年次の高い人と低い人がバランスよく分かれるように、蛇行ドラフト方式で分配します。

### MVP選出のロジック

| 評価軸 | 内容 | 配点 |
|---|---|---|
| 定量評価（50%） | 得点数×3pt、勝利×2pt | 経験なし+30%、若手+15%ボーナス |
| 定性評価（50%） | コメント数×2pt、ポジティブワード+1pt | 長文コメント+1〜2pt |

## CI/CD（GitHub → GAS 自動デプロイ）

`master` ブランチにpushすると、GitHub Actions 経由で自動的にGASプロジェクトへデプロイされます。

### 仕組み

- [clasp](https://github.com/google/clasp)（Google Apps Script CLI）を使用
- GitHub Actions が `clasp push --force` を実行し、GAS側のコードを更新

### 初回セットアップ手順

#### 1. Apps Script API を有効化

https://script.google.com/home/usersettings にアクセスし、Google Apps Script API をオンにする。

#### 2. clasp をインストール & ログイン

```bash
npm install -g @google/clasp
clasp login
```

ブラウザが開くので、GASを管理しているGoogleアカウントで認証する。

#### 3. GitHub Secrets を登録

リポジトリの **Settings → Secrets and variables → Actions** で以下を登録：

| Secret名 | 値 | 説明 |
|---|---|---|
| `SCRIPT_ID` | GASのスクリプトID | GASエディタ →「プロジェクトの設定」→「スクリプトID」 |
| `CLASPRC_JSON` | `~/.clasprc.json` の中身全体 | `clasp login` で生成される認証情報（JSON） |

CLI で登録する場合：

```bash
gh secret set SCRIPT_ID
# プロンプトにスクリプトIDを入力

# Windows (PowerShell)
Get-Content ~/.clasprc.json | gh secret set CLASPRC_JSON

# macOS / Linux
gh secret set CLASPRC_JSON < ~/.clasprc.json
```

#### 4. ローカル開発用の設定（任意）

プロジェクトルートに `.clasp.json` を作成（`.gitignore` で除外済み）：

```json
{
  "scriptId": "あなたのスクリプトID",
  "rootDir": "src"
}
```

### デプロイの確認方法

- **GitHub Actions**: https://github.com/thenotoriousoga/Salu-Reco/actions でpushごとの実行結果を確認
- **GASエディタ**: https://script.google.com でプロジェクトを開き、コードが更新されていることを確認

## 技術構成

- **バックエンド**: Google Apps Script（7ファイル）
- **フロントエンド**: HTML + CSS + JavaScript
- **データベース**: Google スプレッドシート（7シート）
- **アンケート**: Google フォーム（自動生成）
- **デザイン**: Fira Sans / Fira Code、Vibrant & Block-based スタイル

### スプレッドシート構成

| シート名 | 用途 |
|---|---|
| メンバー | ID, 名前, 年次, サッカー経験, 幹事, 登録日 |
| イベント | イベントID, 日付, 名称, ステータス, MVP人数, 準MVP人数, フォームURL, フォームID |
| ラウンド | ラウンドID, イベントID, ラウンド番号, チームA名, チームB名, スコアA, スコアB, ステータス |
| ラウンドメンバー | ラウンドID, メンバーID, チーム |
| 得点 | ラウンドID, メンバーID, 得点数 |
| アンケート回答 | イベントID, 回答者名, 対象メンバーID, 対象メンバー名, コメント |
| MVP結果 | イベントID, メンバーID, 名前, 順位, 理由, 定量スコア, 定性スコア, 総合スコア |
