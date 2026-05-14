# バックエンド アーキテクチャ設計

## 採用アーキテクチャ

**Clean Architecture + DDD (Tactical Patterns) + Hexagonal (Ports & Adapters)**

3つのアーキテクチャスタイルを組み合わせ、それぞれの強みを活かす。

| スタイル | 本プロジェクトでの役割 |
|---|---|
| Clean Architecture | 依存方向の制御（外→内のみ） |
| DDD Tactical Patterns | ドメイン層の構造化（集約、値オブジェクト、ドメインイベント） |
| Hexagonal (Ports & Adapters) | 外部システムとの接続点の抽象化 |

### 依存ルール（最重要原則）

```
Infrastructure (Adapters) → Application (Use Cases) → Domain (Core)
```

- **Domain 層は何にも依存しない**（Kotlin 標準ライブラリのみ）
- **Application 層は Domain 層のみに依存**
- **Infrastructure 層は全層に依存可能**（ポートの実装を提供する）

```
┌─────────────────────────────────────────────────────────────┐
│  Infrastructure 層 (Adapters)                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Application 層 (Use Cases / Ports)                   │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Domain 層 (Entities, Value Objects, Events)    │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 設計検証基準

> "Create your application to work without either a UI or a database"
> — Alistair Cockburn

Domain 層のテストがフレームワークやDBなしで実行できれば、境界が正しく引けている。

---

## 技術スタック

| 項目 | 技術 | バージョン |
|---|---|---|
| 言語 | Kotlin | 2.3.x |
| フレームワーク | Spring Boot | 4.0.x |
| ORM | Hibernate (JPA) | 7.x (Spring Boot 管理) |
| DB | PostgreSQL | 16 |
| マイグレーション | Flyway | Spring Boot 管理 |
| API 定義 | OpenAPI 3.1 + openapi-generator | 7.12.x |
| 認証 | JWT (jjwt) | 0.12.x |
| ID 生成 | UUID v7 (uuid-creator) | 6.0.x |
| テスト | JUnit 5 + Kotest + MockK + Testcontainers + ArchUnit | — |

---

## 層の責務

### Domain 層

ビジネスルールの核。外部依存ゼロ。

| 構成要素 | 責務 |
|---|---|
| Entity (集約ルート) | 不変条件の保護、状態遷移、ビジネスロジック |
| Value Object | 不変のドメイン概念。等価性は値で判定 |
| Domain Event | 集約内で起きた事実の記録 |
| Repository Interface (Driven Port) | 永続化の抽象。集約ルート単位で定義 |
| Domain Service | 単一集約に属さないステートレスなドメインロジック |
| Domain Exception | ドメイン固有のエラー |

**禁止事項**:
- `org.springframework.*`, `jakarta.*`, `org.hibernate.*` への依存
- フレームワークアノテーション（`@Service`, `@Component` 等）
- I/O 操作（DB, HTTP, ファイル）

### Application 層

ユースケースのオーケストレーション。ドメインオブジェクトを組み合わせてビジネスフローを実現する。

| 構成要素 | 責務 |
|---|---|
| Command UseCase | 書き込み系ユースケース。トランザクション境界 |
| Query Service Interface (Driven Port) | 読み取り専用クエリの抽象 |
| Command / Query DTO | ユースケースの入出力 |
| Port (他コンテキスト連携) | 他バウンデッドコンテキストとの連携インターフェース |

**許容する依存**:
- Spring の `@Service`, `@Transactional`（オーケストレーション用）
- Domain 層の全要素

**禁止事項**:
- JPA Entity, HTTP リクエスト/レスポンスへの直接アクセス
- Infrastructure 層の具象クラスへの依存

### Infrastructure 層 (Adapters)

ポートの実装を提供する。外部システムとの接続を担う。

| 構成要素 | 責務 |
|---|---|
| Persistence Adapter | Repository Interface の JPA 実装 |
| Query Adapter | QueryService Interface の JPQL 実装 |
| JPA Entity | 永続化専用のデータクラス（ロジックなし） |
| Entity Mapper | Domain Model ⇄ JPA Entity の変換 |
| External Service Adapter | 外部 API (Gemini 等) の呼び出し |
| Presentation (Controller) | HTTP リクエストの受付、レスポンス返却 |

---

## CQRS（コマンド・クエリ分離）

Write と Read を論理的に分離する。物理的なデータストア分離は行わない（同一 DB）。

### Write 側 (Command)

```
Controller → Command UseCase → Domain Model → Repository (Port) → DB
```

- 集約ルートを復元し、ドメインロジックを実行し、保存する
- トランザクション境界は UseCase メソッド単位
- 1 トランザクション = 1 集約の原則

### Read 側 (Query)

```
Controller → QueryService (Port) → JPQL 射影 → DTO → Response
```

- 集約を経由しない。JPQL constructor expression で直接 DTO に射影
- ドメインの不変条件チェックをスキップするため高速
- 画面要件に最適化した Read Model を返す

### コンテキスト境界のルール (Read 側)

| 参照種別 | 許可 | 方法 |
|---|---|---|
| 同一コンテキスト内 JOIN | ○ | JPQL constructor expression |
| 他コンテキストの COUNT/EXISTS | △ (集計のみ) | QueryPort 経由でアプリケーション層マージ |
| 他コンテキストのデータ取得 | △ | QueryPort 経由。直接 JOIN は禁止 |

---

## 詳細設計ドキュメント

| ファイル | 内容 |
|---|---|
| [package-structure.md](package-structure.md) | パッケージ構成とモジュール配置 |
| [domain-modeling.md](domain-modeling.md) | Domain 層の実装パターン（Entity, VO, Event） |
| [persistence-strategy.md](persistence-strategy.md) | JPA 永続化戦略（Persistence Model 分離、Mapper、Fetch） |
| [presentation-layer.md](presentation-layer.md) | API-first アプローチ、Controller 実装パターン |
| [testing-strategy.md](testing-strategy.md) | テスト戦略とアーキテクチャ境界テスト |
| [cross-cutting.md](cross-cutting.md) | 認証・認可、例外ハンドリング、共有カーネル |
