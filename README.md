# Salu-Rec

フットサルの試合管理・MVP選出を行う Web アプリ。

現在、GAS版 (`src/`) からモダンスタックへリプレース作業中です（Phase 5 / 9）。

## 技術スタック

- **Backend**: Spring Boot + Kotlin + JPA (Hibernate)
- **Frontend**: Next.js + TypeScript + CSS 変数
- **DB**: PostgreSQL
- **設計**: Clean Architecture + DDD + Hexagonal + CQRS
- **API**: OpenAPI (YAML) → コード自動生成

バージョン詳細は `backend/build.gradle.kts` と `frontend/package.json` を参照。

## 開発環境 (Docker 完結)

ホストに必要なのは **Docker Desktop** (または Docker Engine) のみ。
Java / Node.js / pnpm などは一切ホストにインストールしません。

```bash
docker compose up -d          # 起動
docker compose logs -f        # ログ
docker compose down           # 停止
docker compose down -v        # ボリュームごと削除 (DB リセット)
```

### 動作確認

| サービス | URL |
|---|---|
| Backend Health | http://localhost:8080/actuator/health |
| Frontend | http://localhost:3000 |
| DB | `docker compose exec db psql -U salurec -d salurec` |

### テスト実行

```bash
docker compose exec backend ./gradlew test
docker compose exec frontend pnpm test
```

詳細なコマンドは [docs/docker-strategy.md](docs/docker-strategy.md) を参照。

## ドキュメント

| 内容 | 場所 |
|---|---|
| バックエンド設計 | [docs/backend/design/](docs/backend/design/README.md) |
| フロントエンド設計 | [docs/frontend/](docs/frontend/README.md) |
| API 仕様 | [api/openapi.yaml](api/openapi.yaml) |
| DB スキーマ (ER 図) | [docs/er-diagram.md](docs/er-diagram.md) |
| Docker 環境 | [docs/docker-strategy.md](docs/docker-strategy.md) |
| リプレース進捗 | [docs/refactoring/09-progress.md](docs/refactoring/09-progress.md) |
| 実行手順 | [docs/refactoring/08-execution-guide.md](docs/refactoring/08-execution-guide.md) |

## 既存の GAS 版について

リプレース完了 (Phase 9) まで `src/` の GAS 版は残します。
詳細は [docs/legacy-readme.md](docs/legacy-readme.md) を参照。
