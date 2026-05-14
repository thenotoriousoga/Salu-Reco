# Git ルール

プロジェクト全体で統一する Git 運用ルール。

## ブランチ戦略（GitHub Flow ベース）

```
master（常にデプロイ可能な状態を保つ）
  └── <type>/<短い説明>（作業ブランチ）
```

### master ブランチ

- **本番デプロイ対象**。CI が `src/` 変更時に GAS へ自動デプロイする
- 常に「動く状態」を保つ。壊れたコードを直接入れない
- **直接 push 禁止**。必ず PR 経由でマージする

### 作業ブランチ

- `master` から切って作業し、PR 経由でマージする
- ブランチ名は `<type>/<短い説明>` 形式（英語、ケバブケース）
- 1ブランチ = 1つの機能 or 修正。複数の無関係な変更を混ぜない
- マージ後はブランチを削除する

### ワークフロー

```bash
# 1. master を最新にする
git checkout master
git pull origin master

# 2. 作業ブランチを切る
git checkout -b feat/match-context

# 3. 作業・コミット（Conventional Commits 形式）
git add <files>
git commit -m "feat(backend): add match aggregate"

# 4. push してPR作成
git push -u origin feat/match-context
gh pr create --title "feat(backend): add match aggregate" --body "..."

# 5. マージ後にブランチ削除
git checkout master
git pull origin master
git branch -d feat/match-context
```

### ブランチ名の type

| type | 用途 | 例 |
|---|---|---|
| `feat` | 新機能 | `feat/match-context`, `feat/mvp-selection` |
| `fix` | バグ修正 | `fix/member-validation`, `fix/event-status` |
| `refactor` | リファクタリング | `refactor/event-aggregate` |
| `docs` | ドキュメントのみ | `docs/update-er-diagram` |
| `chore` | 設定・依存関係など | `chore/upgrade-spring-boot` |
| `ci` | CI/CD 変更 | `ci/add-backend-test-workflow` |

### リプレース作業での運用

Phase 単位で大きな作業ブランチを切り、その中で細かくコミットする:

```
master
  └── feat/phase4-event-context    ← Phase 全体のブランチ
        ├── commit: feat(backend): add event aggregate
        ├── commit: feat(backend): add create event use case
        ├── commit: feat(backend): add event JPA entity and repository
        └── commit: feat(frontend): add event list page
```

Phase が大きすぎる場合は、サブ機能ごとにブランチを分けて順次マージしてもよい。

## コミットメッセージ

Conventional Commits 形式を使用する。

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### type 一覧

| type | 用途 |
|---|---|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメントのみ |
| `style` | フォーマット変更（ロジック変更なし） |
| `refactor` | リファクタリング（機能追加・修正なし） |
| `perf` | パフォーマンス改善 |
| `test` | テスト追加・修正 |
| `build` | ビルドシステム・依存関係 |
| `ci` | CI 設定変更 |
| `chore` | その他メンテナンス |

### scope の例

- `backend`, `frontend`, `api`, `docker`, `gas`, `docs`
- より具体的: `member`, `match`, `event`, `survey`, `mvp`, `identity`

### ルール

- description は英語、命令形、現在形（例: "add", "fix", "remove"）
- 72文字以内
- 末尾にピリオドを付けない
- body は変更の「なぜ」を説明する（任意）
- 破壊的変更は `!` を付けるか `BREAKING CHANGE:` フッターを使う

### 例

```
feat(backend): add member registration use case

fix(frontend): correct routing for event detail page

docs: update progress tracking for Phase 4

refactor(backend)!: rename aggregate root to follow DDD conventions

BREAKING CHANGE: MemberId value object moved to shared kernel
```

## コミット粒度

- 1コミット = 1つの論理的変更
- 大きな機能は意味のある単位に分割する
- 「動く状態」でコミットする（ビルドが壊れた状態でコミットしない）

## ステージング

- `git add .` は避ける。変更内容を確認して関連ファイルのみステージする
- `.env`、認証情報、シークレットを絶対にコミットしない
- `.gitignore` に含まれるべきファイルが漏れていないか注意する

## PR（Pull Request）

- タイトルはコミットメッセージと同じ Conventional Commits 形式
- description に変更概要・テスト内容・影響範囲を記載
- 1 PR = 1つの機能 or 修正（巨大な PR を避ける）

## 禁止事項

- `master` への直接 push
- `--force` push（明示的に許可された場合を除く）
- `git reset --hard`（明示的に許可された場合を除く）
- `--no-verify` でのフック回避（明示的に許可された場合を除く）
- シークレット・認証情報のコミット
