# パッケージ構成

## トップレベル構造

バウンデッドコンテキストごとにパッケージを分割し、各コンテキスト内で層を分ける。

```
com.salurec
├── shared/                        ← Shared Kernel（最小限）
│   ├── domain/
│   │   ├── EntityId.kt            ID 型の基底インターフェース
│   │   ├── DomainEvent.kt         ドメインイベント基底
│   │   ├── DomainEventPublisher.kt  イベント発行ポート
│   │   ├── DomainException.kt     ドメイン例外基底
│   │   ├── IdGenerator.kt         ID 生成ポート
│   │   └── Clock.kt               時計ポート
│   ├── infrastructure/
│   │   ├── UuidV7IdGenerator.kt   UUID v7 生成実装
│   │   ├── SystemClock.kt         システム時計実装
│   │   └── SpringDomainEventPublisher.kt
│   └── web/
│       ├── ApiErrorResponse.kt    統一エラーレスポンス
│       └── GlobalExceptionHandler.kt
│
├── event/                         ← Event コンテキスト
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
│
├── member/                        ← Member コンテキスト
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
│
├── match/                         ← Match Operation コンテキスト
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
│
├── mvp/                           ← MVP Evaluation コンテキスト
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
│
├── survey/                        ← Survey コンテキスト
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
│
├── identity/                      ← Identity & Access コンテキスト
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   └── presentation/
│
└── SaluRecApplication.kt         エントリーポイント
```

---

## コンテキスト内の詳細構造

Event コンテキストを例に示す。全コンテキスト同じ構造に従う。

```
com.salurec.event
├── domain/                                  ← 純粋 Kotlin。外部依存ゼロ
│   ├── model/
│   │   ├── Event.kt                         集約ルート
│   │   ├── EventId.kt                       値オブジェクト (value class)
│   │   ├── EventName.kt                     値オブジェクト
│   │   ├── EventStatus.kt                   Enum
│   │   └── JoinCode.kt                      値オブジェクト
│   ├── event/                               ドメインイベント
│   │   ├── EventCreated.kt
│   │   ├── EventStarted.kt
│   │   └── EventFinished.kt
│   ├── port/                                Driven Port (Repository)
│   │   └── EventRepository.kt              集約ルートの永続化インターフェース
│   ├── service/                             ドメインサービス
│   │   └── JoinCodeGenerator.kt            インターフェース
│   └── exception/
│       ├── EventNotFoundException.kt
│       └── InvalidEventStateException.kt
│
├── application/                             ← ユースケース層
│   ├── command/                             Write 側
│   │   ├── CreateEventUseCase.kt
│   │   ├── StartEventUseCase.kt
│   │   ├── FinishEventUseCase.kt
│   │   └── ReopenEventUseCase.kt
│   ├── query/                               Read 側
│   │   ├── EventQueryService.kt            インターフェース (Driven Port)
│   │   └── dto/
│   │       ├── EventListItemDto.kt
│   │       └── EventDetailDto.kt
│   ├── port/                                他コンテキスト連携ポート
│   │   └── MemberQueryPort.kt
│   └── dto/                                 Command の入出力
│       ├── CreateEventCommand.kt
│       └── CreateEventResult.kt
│
├── infrastructure/                          ← Adapter 実装
│   ├── persistence/
│   │   ├── entity/
│   │   │   └── EventJpaEntity.kt           JPA Entity（永続化専用）
│   │   ├── repository/
│   │   │   ├── EventJpaRepository.kt       Spring Data JPA
│   │   │   └── EventRepositoryImpl.kt      Domain Port の実装
│   │   ├── query/
│   │   │   └── EventQueryServiceImpl.kt    Query Port の実装
│   │   └── mapper/
│   │       └── EventEntityMapper.kt        Domain ⇄ JPA Entity 変換
│   ├── service/
│   │   └── JoinCodeGeneratorImpl.kt        ドメインサービスの実装
│   └── adapter/
│       └── MemberQueryAdapter.kt           他コンテキスト連携の実装
│
└── presentation/                            ← HTTP Adapter (Driver)
    └── controller/
        ├── EventCommandController.kt       Write 用 Controller
        └── EventQueryController.kt         Read 用 Controller
```

---

## パッケージ設計の原則

### 1. コンテキスト単位のモジュール化

各コンテキストは独立したモジュールとして機能する。コンテキスト間の依存は Port 経由のみ。

### 2. Controller の分割

Command と Query で Controller を分ける。パスは同じリソースを共有する。

| Controller | 責務 | エンドポイント例 |
|---|---|---|
| `EventCommandController` | 状態変更操作 | `POST /api/events`, `POST /api/events/{id}/start` |
| `EventQueryController` | 参照操作 | `GET /api/events`, `GET /api/events/{id}` |

### 3. DTO の配置ルール

| DTO 種別 | 配置場所 | 理由 |
|---|---|---|
| Command (入力) | `application/dto/` | UseCase の入力仕様 |
| Result (出力) | `application/dto/` | UseCase の出力仕様 |
| Query DTO (Read Model) | `application/query/dto/` | 画面要件に合わせた射影 |
| Request / Response | openapi-generator 自動生成 | API 仕様から生成。手書き不要 |

### 4. 循環依存の防止

```
identity → (全コンテキストが JWT 仕様に従う: Conformist)
event ← member, match, survey, mvp (一方向)
match, survey → mvp (一方向)
```

ArchUnit テストで逆方向の依存を検出・禁止する。
