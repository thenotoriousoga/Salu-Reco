# 実行環境ルール

ビルド・テスト・依存管理は全て Docker コンテナ内で実行する。ホスト OS で直接実行してよいのは `git` と `docker compose` のみ。

| 対象 | コマンド形式 |
|---|---|
| バックエンド | `docker compose exec backend ./gradlew ...` |
| フロントエンド | `docker compose exec frontend pnpm ...` |

`pnpm install`, `./gradlew`, `npm install` 等をホスト OS で直接実行してはいけない。
