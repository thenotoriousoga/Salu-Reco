# AGENTS.md — バックエンド

AI エージェントがバックエンド (`backend/`) のコードを変更する際のルール。

## 最初に読むもの

1. [design/README.md](design/README.md) — 設計ドキュメントの読み順ガイド
2. [design/package-structure.md](design/package-structure.md) — ファイルをどこに置くか
3. 変更対象コンテキストの `design/{context}/` — 集約・ユースケースの詳細

## 絶対に守るルール

1. **依存方向**: `Infrastructure → Application → Domain`。逆方向は禁止
2. **Domain 層にフレームワーク依存を入れない**: `org.springframework.*`, `jakarta.*`, `org.hibernate.*` は禁止
3. **集約は不変**: `data class` + `val`。状態変更は `copy()` で新インスタンスを返す
4. **他コンテキストの集約を直接参照しない**: ID のみ保持。データが必要なら Port 経由
5. **他コンテキストのテーブルに直接 JOIN しない**
6. **Request / Response クラスを手書きしない**: openapi-generator が `api/openapi.yaml` から自動生成する
7. **DDL を Hibernate に任せない**: `ddl-auto=validate` 固定。スキーマ変更は Flyway マイグレーションで行う

## ファイル配置の早見表

| 追加するもの | 配置先 |
|---|---|
| ビジネスルール・集約 | `{context}/domain/model/` |
| ドメインイベント | `{context}/domain/event/` |
| Repository インターフェース | `{context}/domain/port/` |
| ドメインサービス（IF） | `{context}/domain/service/` |
| ドメイン例外 | `{context}/domain/exception/` |
| ユースケース（Command） | `{context}/application/command/` |
| クエリサービス（IF） | `{context}/application/query/` |
| DTO（Command/Result） | `{context}/application/dto/` |
| DTO（Query） | `{context}/application/query/dto/` |
| 他コンテキスト連携ポート | `{context}/application/port/` |
| JPA Entity | `{context}/infrastructure/persistence/entity/` |
| Repository 実装 | `{context}/infrastructure/persistence/repository/` |
| Query 実装 | `{context}/infrastructure/persistence/query/` |
| Mapper | `{context}/infrastructure/persistence/mapper/` |
| Controller | `{context}/presentation/controller/` |
| Flyway マイグレーション | `src/main/resources/db/migration/V{番号}__{説明}.sql` |

## ビルド・テスト

```bash
./gradlew build          # ビルド + テスト
./gradlew test           # テストのみ
docker compose up -d     # ローカル起動（プロジェクトルートから）
```

## コード変更後に更新すべきドキュメント

| 変更内容 | 更新対象 |
|---|---|
| 集約の追加・変更 | `design/{context}/aggregates.md` + `design/aggregates-overview.md` |
| ユースケースの追加 | `design/{context}/usecases.md` |
| ドメインイベントの追加 | `design/{context}/domain-events.md` |
| 新しいドメイン用語 | `design/ubiquitous-language.md` |
| コンテキスト間の関係変更 | `design/context-map.md` |
| API エンドポイントの追加 | `api/openapi.yaml` |
