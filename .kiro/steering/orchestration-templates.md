---
inclusion: manual
---

# サブエージェント指示テンプレート集

`orchestration.md` の補助ドキュメント。サブエージェントへの指示を組み立てる際に参照する。

## backend-domain への指示テンプレート

```
【スキル】clean-ddd-hexagonal, kotlin-springboot を有効化してください
【タスク】{コンテキスト名}の {ユースケース名} ユースケースを実装
【参照】
- docs/backend/design/{context}/usecases.md
- docs/backend/design/{context}/aggregates.md
- docs/backend/design/{context}/domain-events.md
【成果物】
- domain/{context}/model/{Aggregate}.kt
- domain/{context}/port/{Repository}Port.kt
- application/{context}/command/{UseCase}UseCase.kt
- application/{context}/dto/{Command}Command.kt
【制約】
- Infrastructure 層のコードは変更しない
- 他コンテキストの集約を直接参照しない（ID のみ保持）
```

## backend-infra への指示テンプレート

```
【スキル】kotlin-springboot を有効化してください
【タスク】{コンテキスト名}の Infrastructure 層と Presentation 層を実装
【参照】
- docs/backend/design/persistence-strategy.md
- docs/backend/design/presentation-layer.md
- api/openapi.yaml
- {backend-domain が作成した Port ファイルのパス}
【成果物】
- infrastructure/{context}/persistence/entity/{Entity}Entity.kt
- infrastructure/{context}/persistence/repository/{Repository}Impl.kt
- infrastructure/{context}/persistence/mapper/{Mapper}.kt
- presentation/{context}/controller/{Controller}Controller.kt
- src/main/resources/db/migration/V{番号}__{説明}.sql
【制約】
- Request/Response クラスは openapi-generator の生成物を使用（手書き禁止）
- DDL は Flyway マイグレーションのみ（Hibernate ddl-auto 禁止）
- 他コンテキストのテーブルに直接 JOIN しない
```

## frontend-impl への指示テンプレート

```
【スキル】frontend-design, vercel-react-best-practices を有効化してください
【タスク】{ページ/コンポーネント名} を実装
【参照】
- docs/frontend/architecture.md
- docs/frontend/components.md
- docs/frontend/design-system.md
- api/openapi.yaml（該当エンドポイント）
【成果物】
- app/{path}/page.tsx
- components/{ComponentName}.tsx（必要に応じて）
【制約】
- バックエンドのコードは変更しない
- API 型は openapi-generator の生成物を使用
- Tailwind CSS + CSS 変数のハイブリッドスタイルを使用
```

## openapi-design への指示テンプレート

```
【スキル】openapi-spec-generation を有効化してください
【タスク】{機能名} の API エンドポイントを設計
【参照】
- docs/backend/design/{context}/usecases.md
- api/openapi.yaml（既存の構造を確認）
【成果物】
- api/openapi.yaml への追記/変更
【制約】
- 既存エンドポイントの破壊的変更は避ける
- レスポンス形式は既存パターンに合わせる
- パス命名は kebab-case
```

## docker-infra への指示テンプレート

```
【スキル】docker-expert を有効化してください
【タスク】{変更内容}
【参照】
- docs/docker-strategy.md
- docker-compose.yml
- docker/{対象}.Dockerfile
【成果物】
- docker-compose.yml の変更
- docker/{対象}.Dockerfile の変更
【制約】
- 既存サービスの動作を壊さない
- マルチステージビルドを維持
```

## git-operations への指示テンプレート

```
【タスク】変更をコミットして push
【ブランチ】feature/{機能名}
【コミットメッセージ】{Conventional Commits 形式}
【対象ファイル】{ステージングするファイル一覧}
【制約】
- main/master への直接 push 禁止
- .env, credentials 等のシークレットファイルを含めない
```

## 依存チェーンの指示例（API変更を伴う機能追加）

### Step 1: openapi-design

```
【タスク】メンバー登録 API を設計
【参照】docs/backend/design/member/usecases.md
```

### Step 2: backend-domain（openapi-design 完了後）

```
【タスク】Member コンテキストの RegisterMember ユースケースを実装
【参照】
- docs/backend/design/member/usecases.md
- docs/backend/design/member/aggregates.md
```

### Step 3: backend-infra（backend-domain 完了後）

```
【タスク】Member コンテキストの Infrastructure 層を実装
【参照】
- backend/src/main/kotlin/com/salurec/member/domain/port/MemberRepositoryPort.kt
- backend/src/main/kotlin/com/salurec/member/application/query/MemberQueryService.kt
- api/openapi.yaml
```

### Step 4: frontend-impl（openapi-design 完了後、バックエンドと独立可）

```
【タスク】メンバー登録ページを実装
【参照】
- api/openapi.yaml（POST /events/{eventId}/members）
- docs/frontend/components.md
```
