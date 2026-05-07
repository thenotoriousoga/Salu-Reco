# Salu-Rec

フットサルの試合管理・MVP選出を行う Web アプリ。

現在、GAS版 (`src/`) からモダンスタックへリプレース作業中です。
詳細は [docs/refactoring/README.md](docs/refactoring/README.md) を参照してください。

## 技術スタック (TO BE)

- **Backend**: Spring Boot 4.0.6 + Kotlin 2.3.21 + JPA (Hibernate 7)
- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS
- **DB**: PostgreSQL 16
- **設計**: ドメイン駆動設計 + オニオンアーキテクチャ + CQRS

## 開発環境 (Docker 完結)

ホストに必要なのは **Docker Desktop** (または Docker Engine) のみ。
Java / Node.js / pnpm などは一切ホストにインストールしません。

### 起動

```
docker compose up -d
```

初回は数分(Gradle と pnpm の依存ダウンロード)かかります。
ログを追いたい場合:

```
docker compose logs -f
```

### 動作確認

- Backend: http://localhost:8080/actuator/health → `{"status":"UP"}` が返る
- Frontend: http://localhost:3000 → Next.js のページ
- DB: `docker compose exec db psql -U salurec -d salurec`

### 停止

```
docker compose down         # コンテナ停止
docker compose down -v      # ボリュームも削除 (DB もリセット)
```

### コンテナ内で作業する

```
docker compose exec backend bash
docker compose exec frontend sh
docker compose exec db psql -U salurec -d salurec
```

### テスト実行

```
docker compose exec backend ./gradlew test
docker compose exec frontend pnpm test
```

## ドキュメント

- [リプレース設計ドキュメント](docs/refactoring/README.md)
- [進捗チェックリスト](docs/refactoring/09-progress.md)
- [実行手順](docs/refactoring/08-execution-guide.md)
- [設計決定記録 (ADR)](docs/refactoring/10-decisions.md)

## 既存の GAS 版について

リプレース完了まで `src/` の GAS 版は残します。
詳細は [docs/legacy-readme.md](docs/legacy-readme.md) を参照してください。
