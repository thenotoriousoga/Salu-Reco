# バックエンド アーキテクチャ (Spring Boot + Kotlin + JPA)

## 採用アーキテクチャ: オニオンアーキテクチャ × CQRS

```
                    ┌────────────────────────────────────────┐
                    │   Infrastructure / Presentation 層     │
                    │  (Controller, JPA Entity,              │
                    │   Repository 実装, 外部API Gateway,    │
                    │   Security, Config)                    │
                    │                                        │
                    │    ┌──────────────────────────────┐    │
                    │    │    Application Services 層    │    │
                    │    │                              │    │
                    │    │  ┌────────────┬──────────┐   │    │
                    │    │  │  Command   │  Query   │   │    │
                    │    │  │ UseCase    │ Service  │   │    │
                    │    │  └────────────┴──────────┘   │    │
                    │    │   ← CQRSで分離 →             │    │
                    │    │                              │    │
                    │    │   ┌────────────────────┐     │    │
                    │    │   │ Domain Services 層  │     │    │
                    │    │   │                    │     │    │
                    │    │   │ ┌───────────────┐  │     │    │
                    │    │   │ │ Domain Model   │  │     │    │
                    │    │   │ │ (Entity, VO,   │  │     │    │
                    │    │   │ │  Aggregate,    │  │     │    │
                    │    │   │ │  Repository I/F│  │     │    │
                    │    │   │ │  Domain Event) │  │     │    │
                    │    │   │ └───────────────┘  │     │    │
                    │    │   └────────────────────┘     │    │
                    │    └──────────────────────────────┘    │
                    └────────────────────────────────────────┘

             依存方向: 外側 → 内側 のみ (内側は外側を知らない)
```

### 層の責務

| # | 層 | 責務 | 依存可能先 |
|---|---|---|---|
| 1 | **Domain Model** (最内) | エンティティ、値オブジェクト、集約、ドメインイベント、Repository インターフェース | なし (Kotlin標準のみ) |
| 2 | **Domain Services** | 複数集約にまたがるロジック、集約ルートに属さないドメインロジック | Domain Model |
| 3 | **Application Services** | ユースケースの調整、トランザクション境界、ドメインイベント発行 | Domain Model, Domain Services |
| 4 | **Infrastructure / Presentation** | JPA Entity・Repository実装、Controller、Gateway、Security、設定 | 全層 |

**鉄則**:
- Domain Model は `org.springframework.*` / `jakarta.*` / `org.hibernate.*` に依存しない
- Domain Services もフレームワーク非依存
- Application Services は Spring の `@Service` / `@Transactional` まで許容するが、JPA EntityやHTTPは触らない
- Infrastructure 層のみフレームワーク・ライブラリに自由にアクセス

---

## ORM: JPA (Hibernate) + Persistence Model パターン

### 方針

**ドメインモデルと JPA Entity を完全に分離する**。

```
[Domain Model] ─── Mapper ───> [JPA Entity] ── Hibernate ──> [Database]
  (純粋 Kotlin)                (永続化用)
  data class, val              class, var, @Entity
```

| 項目 | ドメインモデル | JPA Entity |
|---|---|---|
| クラス修飾 | `data class` | `class` (不変性は強制しない) |
| フィールド | `val` | `var` (Hibernateが書き換えるため) |
| パッケージ | `domain.model` | `infrastructure.persistence.entity` |
| フレームワーク | Kotlin標準のみ | `jakarta.persistence.*` |
| 振る舞い | ビジネスロジック、不変条件チェック | 永続化のみ(ロジックなし) |
| 値オブジェクト | `value class` / `data class` | プリミティブ or Embedded |

### Fetch 戦略

- **基本はすべて `FetchType.LAZY`**
- 集約ルートを取得したあと、必要なとき(ドメイン変換のタイミングなど)に明示的にトラバースしてロード
- `@EntityGraph` や `JOIN FETCH` でのまとめ取りは **必要になってから** 追加
- N+1 が発生するかは Testcontainers による統合テストで SQL ログを検証する

### JSON型カラム

`rounds.team_assignment` など JSONB カラムは `hypersistence-utils` の `@Type(JsonType::class)` を利用する。

---

## パッケージ構成

Event コンテキストを例に示す。全コンテキスト同じ構造。

```
com.salurec.event
├── domain/                                  ← Layer 1 + 2
│   ├── model/                               純粋 Kotlin。JPA アノテーションなし
│   │   ├── Event.kt                         集約ルート (data class)
│   │   ├── EventId.kt                       値オブジェクト (value class)
│   │   ├── EventName.kt
│   │   ├── EventStatus.kt                   Enum
│   │   └── JoinCode.kt
│   ├── event/                               ドメインイベント
│   │   ├── EventCreated.kt
│   │   └── EventStarted.kt
│   ├── service/
│   │   └── JoinCodeGenerator.kt             I/F
│   ├── repository/
│   │   └── EventRepository.kt               I/F。Write 用のみ
│   └── exception/
│       ├── EventNotFoundException.kt
│       └── IllegalEventStateException.kt
│
├── application/                             ← Layer 3
│   ├── command/                             Write 側
│   │   ├── usecase/
│   │   │   ├── CreateEventUseCase.kt
│   │   │   ├── StartEventUseCase.kt
│   │   │   └── FinishEventUseCase.kt
│   │   ├── command/
│   │   │   └── CreateEventCommand.kt
│   │   └── result/
│   │       └── CreateEventResult.kt
│   ├── query/                               Read 側
│   │   ├── service/
│   │   │   └── EventQueryService.kt         I/F
│   │   ├── dto/
│   │   │   ├── EventListItemDto.kt
│   │   │   └── EventDetailDto.kt
│   │   └── param/
│   │       └── ListEventsQuery.kt
│   └── port/                                他コンテキスト連携 I/F
│       └── MemberRegistrationPort.kt
│
├── infrastructure/                          ← Layer 4
│   ├── persistence/
│   │   ├── entity/                          JPA Entity (var, @Entity)
│   │   │   └── EventJpaEntity.kt
│   │   ├── repository/
│   │   │   ├── EventJpaRepository.kt        Spring Data JPA (CrudRepository)
│   │   │   └── EventRepositoryImpl.kt       Domain の Repository I/F を実装
│   │   ├── query/
│   │   │   └── EventQueryServiceImpl.kt     Query I/F を実装 (JPQL射影)
│   │   └── mapper/
│   │       └── EventEntityMapper.kt         Domain ⇄ JPA Entity 変換
│   ├── service/
│   │   └── JoinCodeGeneratorImpl.kt
│   └── adapter/
│       └── MemberRegistrationAdapter.kt     他コンテキスト呼び出しアダプタ
│
└── presentation/                            ← Layer 4
    ├── controller/
    │   ├── EventCommandController.kt
    │   └── EventQueryController.kt
    ├── dto/
    │   ├── request/
    │   │   └── CreateEventRequest.kt
    │   └── response/
    │       ├── EventResponse.kt
    │       └── EventDetailResponse.kt
    └── mapper/
        ├── EventRequestMapper.kt            Request → Command
        └── EventResponseMapper.kt           Dto/Result → Response
```

### Controller の分け方

Command と Query で Controller を分ける。
パスは同じリソース (`/api/events`) を共有する。

| Controller | メソッド | エンドポイント |
|---|---|---|
| `EventCommandController` | `POST /api/events` | イベント作成 |
| `EventCommandController` | `POST /api/events/{id}/start` | イベント開始 |
| `EventQueryController`   | `GET /api/events` | イベント一覧 |
| `EventQueryController`   | `GET /api/events/{id}` | イベント詳細 |

---

## Domain 層

### 純粋 Kotlin。JPA に依存しない。

### Event.kt (集約ルート)

```kotlin
package com.salurec.event.domain.model

import com.salurec.shared.domain.EntityId
import java.time.LocalDate
import kotlin.jvm.JvmInline

@JvmInline
value class EventId(override val value: String) : EntityId {
    init { require(value.length in 4..36) { "EventIdが不正" } }
}

@JvmInline
value class EventName(val value: String) {
    init {
        require(value.isNotBlank()) { "イベント名を入力してください" }
        require(value.length <= 100) { "イベント名は100文字以内です" }
    }
}

enum class EventStatus { Preparing, InProgress, Finished }

data class Event(
    val id: EventId,
    val name: EventName,
    val date: LocalDate,
    val status: EventStatus,
    val joinCode: JoinCode,
    val surveyFormId: String? = null,
    val surveyFormUrl: String? = null,
) {
    fun start(memberCount: Int): Event {
        check(status == EventStatus.Preparing) { "準備中のイベントのみ開始できます" }
        require(memberCount >= 2) { "メンバーを2名以上登録してください" }
        return copy(status = EventStatus.InProgress)
    }

    fun finish(roundCount: Int, hasOngoingRound: Boolean): Event {
        check(status == EventStatus.InProgress) { "進行中のイベントのみ終了できます" }
        require(roundCount > 0) { "ラウンドがありません" }
        require(!hasOngoingRound) { "進行中のラウンドがあります" }
        return copy(status = EventStatus.Finished)
    }

    fun reopen(): Event {
        check(status == EventStatus.Finished) { "イベント終了状態のイベントのみ再開できます" }
        return copy(status = EventStatus.InProgress)
    }
}
```

### EventRepository.kt (I/F のみ)

```kotlin
package com.salurec.event.domain.repository

import com.salurec.event.domain.model.*

/**
 * Write 側の Repository。集約ルートの復元・保存のみを担う。
 * Read 向けの検索は QueryService を使う。
 */
interface EventRepository {
    fun save(event: Event): Event
    fun findById(id: EventId): Event?
    fun findByJoinCode(code: JoinCode): Event?
    fun existsByJoinCode(code: JoinCode): Boolean
    fun delete(id: EventId)
}
```

---

## Application 層

### Command 側

#### CreateEventCommand.kt

```kotlin
package com.salurec.event.application.command.command

import java.time.LocalDate

data class CreateEventCommand(
    val name: String,
    val date: LocalDate,
    val organizerName: String,
)
```

#### CreateEventUseCase.kt

```kotlin
package com.salurec.event.application.command.usecase

import com.salurec.event.application.command.command.CreateEventCommand
import com.salurec.event.application.command.result.CreateEventResult
import com.salurec.event.application.port.MemberRegistrationPort
import com.salurec.event.domain.event.EventCreated
import com.salurec.event.domain.model.*
import com.salurec.event.domain.repository.EventRepository
import com.salurec.event.domain.service.JoinCodeGenerator
import com.salurec.shared.domain.DomainEventPublisher
import com.salurec.shared.domain.IdGenerator
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class CreateEventUseCase(
    private val eventRepository: EventRepository,
    private val joinCodeGenerator: JoinCodeGenerator,
    private val memberRegistration: MemberRegistrationPort,
    private val idGenerator: IdGenerator,
    private val eventPublisher: DomainEventPublisher,
) {
    @Transactional
    fun execute(command: CreateEventCommand): CreateEventResult {
        val eventId = EventId(idGenerator.generate())
        val joinCode = joinCodeGenerator.generateUnique()

        val event = Event(
            id = eventId,
            name = EventName(command.name),
            date = command.date,
            status = EventStatus.Preparing,
            joinCode = joinCode,
        )
        eventRepository.save(event)

        val organizerMemberId = memberRegistration.registerOrganizer(
            eventId = eventId.value,
            name = command.organizerName,
        )

        eventPublisher.publish(EventCreated(eventId))

        return CreateEventResult(eventId, joinCode, organizerMemberId)
    }
}
```

### Query 側

#### EventListItemDto.kt (ReadModel)

```kotlin
package com.salurec.event.application.query.dto

import java.time.LocalDate

/**
 * イベント一覧画面用の ReadModel。
 * ドメインモデル Event ではなく、画面要件に合わせた形で返す。
 */
data class EventListItemDto(
    val id: String,
    val name: String,
    val date: LocalDate,
    val status: String,
    val joinCode: String,
    val memberCount: Int,
    val roundCount: Int,
    val hasMvpResult: Boolean,
)
```

#### EventQueryService.kt (I/F)

```kotlin
package com.salurec.event.application.query.service

import com.salurec.event.application.query.dto.*
import com.salurec.event.application.query.param.ListEventsQuery

/**
 * Read 側のクエリサービス。
 * 集約を経由せず、JPQL の constructor expression で直接 DTO に射影する。
 */
interface EventQueryService {
    fun list(query: ListEventsQuery): List<EventListItemDto>
    fun findDetail(id: String): EventDetailDto?
}
```

### Query 側の利点

- 画面要件(イベント一覧の「メンバー数」「ラウンド数」など)に合わせた Read 専用 DTO を返せる
- 集約をロードしてループする必要がなく、1 本の JPQL で済む
- ドメインの不変条件チェックをスキップできるため高速

**ただし制約**(コンテキスト境界):
- 同一コンテキスト内の JOIN は OK
- 他コンテキストのテーブルに JOIN したい場合、そのコンテキストの QueryService を呼び出してアプリケーション層でマージ
- 超シンプルな集計(COUNT/EXISTS)に限り、Read View としてクロスコンテキスト参照を許容

---

## Infrastructure 層 (JPA)

### JPA Entity

`@Entity` クラスは永続化専用。ドメインロジックは書かない。

#### EventJpaEntity.kt

```kotlin
package com.salurec.event.infrastructure.persistence.entity

import jakarta.persistence.*
import java.time.Instant
import java.time.LocalDate

@Entity
@Table(name = "events")
class EventJpaEntity(
    @Id
    @Column(name = "id", length = 8, nullable = false, updatable = false)
    var id: String,

    @Column(name = "name", nullable = false)
    var name: String,

    @Column(name = "event_date", nullable = false)
    var eventDate: LocalDate,

    @Column(name = "status", nullable = false)
    var status: String,

    @Column(name = "join_code", nullable = false, unique = true, length = 5)
    var joinCode: String,

    @Column(name = "survey_form_id")
    var surveyFormId: String? = null,

    @Column(name = "survey_form_url")
    var surveyFormUrl: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
) {
    // Hibernate が要求する no-arg constructor (kotlin-jpa プラグインが自動生成)
    // ※ protected 指定は不要(プラグインにより synthetic で生成される)

    @PreUpdate
    fun onUpdate() { updatedAt = Instant.now() }
}
```

**ポイント**:
- `data class` ではなく通常の `class`。Hibernate のプロキシや equals/hashCode の挙動と相性を取るため
- 全フィールド `var`(Hibernate が書き換えるため)
- `kotlin("plugin.jpa")` で `no-arg` コンストラクタが自動生成される
- `kotlin("plugin.allopen")` で `@Entity` クラスは自動で `open` 扱いになる

### Spring Data JPA Repository

#### EventJpaRepository.kt

```kotlin
package com.salurec.event.infrastructure.persistence.repository

import com.salurec.event.infrastructure.persistence.entity.EventJpaEntity
import org.springframework.data.jpa.repository.JpaRepository

interface EventJpaRepository : JpaRepository<EventJpaEntity, String> {
    fun findByJoinCode(joinCode: String): EventJpaEntity?
    fun existsByJoinCode(joinCode: String): Boolean
}
```

### Domain Repository 実装

#### EventRepositoryImpl.kt

```kotlin
package com.salurec.event.infrastructure.persistence.repository

import com.salurec.event.domain.model.*
import com.salurec.event.domain.repository.EventRepository
import com.salurec.event.infrastructure.persistence.mapper.EventEntityMapper
import org.springframework.stereotype.Repository

@Repository
class EventRepositoryImpl(
    private val jpaRepository: EventJpaRepository,
) : EventRepository {

    override fun save(event: Event): Event {
        val existing = jpaRepository.findById(event.id.value).orElse(null)
        val entity = if (existing != null) {
            // 既存 Entity を書き換えて JPA の dirty checking に任せる
            EventEntityMapper.applyDomain(existing, event)
            existing
        } else {
            EventEntityMapper.toEntity(event)
        }
        val saved = jpaRepository.save(entity)
        return EventEntityMapper.toDomain(saved)
    }

    override fun findById(id: EventId): Event? =
        jpaRepository.findById(id.value)
            .map(EventEntityMapper::toDomain)
            .orElse(null)

    override fun findByJoinCode(code: JoinCode): Event? =
        jpaRepository.findByJoinCode(code.value)
            ?.let(EventEntityMapper::toDomain)

    override fun existsByJoinCode(code: JoinCode): Boolean =
        jpaRepository.existsByJoinCode(code.value)

    override fun delete(id: EventId) {
        jpaRepository.deleteById(id.value)
    }
}
```

### Mapper

#### EventEntityMapper.kt

```kotlin
package com.salurec.event.infrastructure.persistence.mapper

import com.salurec.event.domain.model.*
import com.salurec.event.infrastructure.persistence.entity.EventJpaEntity

object EventEntityMapper {

    fun toDomain(entity: EventJpaEntity): Event = Event(
        id = EventId(entity.id),
        name = EventName(entity.name),
        date = entity.eventDate,
        status = EventStatus.valueOf(entity.status),
        joinCode = JoinCode.from(entity.joinCode),
        surveyFormId = entity.surveyFormId,
        surveyFormUrl = entity.surveyFormUrl,
    )

    fun toEntity(domain: Event): EventJpaEntity = EventJpaEntity(
        id = domain.id.value,
        name = domain.name.value,
        eventDate = domain.date,
        status = domain.status.name,
        joinCode = domain.joinCode.value,
        surveyFormId = domain.surveyFormId,
        surveyFormUrl = domain.surveyFormUrl,
    )

    /**
     * 既存 Entity にドメインの状態を反映する(更新用)。
     * id と joinCode は不変として扱う。
     */
    fun applyDomain(entity: EventJpaEntity, domain: Event) {
        entity.name = domain.name.value
        entity.eventDate = domain.date
        entity.status = domain.status.name
        entity.surveyFormId = domain.surveyFormId
        entity.surveyFormUrl = domain.surveyFormUrl
    }
}
```

---

## 集約内の子エンティティを含む集約の扱い (Round 集約)

Round は `Round → List<Match> → List<MatchParticipant>, List<Goal>` の3階層を持つ。

### JPA Entity の関係

```kotlin
@Entity
@Table(name = "rounds")
class RoundJpaEntity(
    @Id var id: String,
    @Column(name = "event_id", nullable = false) var eventId: String,
    @Column(name = "round_number", nullable = false) var roundNumber: Int,
    @Column(name = "status", nullable = false) var status: String,

    @Type(JsonType::class)
    @Column(name = "team_assignment", columnDefinition = "jsonb", nullable = false)
    var teamAssignment: TeamAssignmentJson,

    @OneToMany(
        mappedBy = "round",
        cascade = [CascadeType.ALL],
        orphanRemoval = true,
        fetch = FetchType.LAZY,           // 基本は LAZY
    )
    @OrderBy("matchNumber ASC")
    var matches: MutableList<MatchJpaEntity> = mutableListOf(),
) {
    // addMatch/removeMatch ヘルパーで双方向関連の整合性を取る
    fun addMatch(match: MatchJpaEntity) {
        matches.add(match)
        match.round = this
    }
    fun removeMatch(match: MatchJpaEntity) {
        matches.remove(match)
        match.round = null
    }
}
```

### 集約ルート保存時の差分反映

`EventRepositoryImpl.save()` と同様、既存 Entity を取得してフィールドを書き換え、
子コレクションは `orphanRemoval = true` + `CascadeType.ALL` の JPA 機能に任せる。

```kotlin
@Repository
class RoundRepositoryImpl(
    private val jpaRepository: RoundJpaRepository,
) : RoundRepository {

    @Transactional
    override fun save(round: Round): Round {
        val existing = jpaRepository.findById(round.id.value).orElse(null)
        val entity = if (existing != null) {
            RoundEntityMapper.applyDomain(existing, round)
            existing
        } else {
            RoundEntityMapper.toEntity(round)
        }
        return RoundEntityMapper.toDomain(jpaRepository.save(entity))
    }

    override fun findById(id: RoundId): Round? =
        // 必要なら @EntityGraph 付きメソッドに切り替え
        jpaRepository.findById(id.value)
            .map(RoundEntityMapper::toDomain)
            .orElse(null)
}
```

### Mapper の apply 処理例 (子コレクションの差分反映)

```kotlin
object RoundEntityMapper {
    fun applyDomain(entity: RoundJpaEntity, domain: Round) {
        entity.status = domain.status.name
        entity.teamAssignment = TeamAssignmentJson.from(domain.teamAssignment)

        // 子コレクションの差分反映
        val incomingIds = domain.matches.map { it.id.value }.toSet()
        val toRemove = entity.matches.filter { it.id !in incomingIds }
        toRemove.forEach(entity::removeMatch)

        val existingById = entity.matches.associateBy { it.id }
        domain.matches.forEach { d ->
            val child = existingById[d.id.value]
            if (child != null) {
                MatchEntityMapper.applyDomain(child, d)
            } else {
                entity.addMatch(MatchEntityMapper.toEntity(d))
            }
        }
    }
}
```

### Fetch 戦略

- **基本**: `FetchType.LAZY`
- トランザクション内で Mapper が子コレクションを触ることで明示的にロード
- トランザクション外でドメインを使う場合はアプリケーション層でロード済みの状態にして渡す
- Read 側(Query Service)では集約を使わず、JPQL で必要なフィールドだけを射影する

---

## Query Service 実装 (JPQL 射影)

集約を経由せず、JPA Entity から JPQL constructor expression で直接 DTO に射影する。

### 同一コンテキスト内のみ参照する場合

```kotlin
package com.salurec.event.infrastructure.persistence.query

import com.salurec.event.application.query.dto.EventListItemDto
import com.salurec.event.application.query.param.ListEventsQuery
import com.salurec.event.application.query.service.EventQueryService
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Service

@Service
class EventQueryServiceImpl(
    private val em: EntityManager,
) : EventQueryService {

    override fun list(query: ListEventsQuery): List<EventListItemDto> {
        val jpql = """
            SELECT new com.salurec.event.application.query.dto.EventListItemDto(
                e.id,
                e.name,
                e.eventDate,
                e.status,
                e.joinCode,
                CAST(0 AS int),
                CAST(0 AS int),
                false
            )
            FROM EventJpaEntity e
            ORDER BY e.eventDate DESC, e.createdAt DESC
        """.trimIndent()

        val events = em.createQuery(jpql, EventListItemDto::class.java).resultList

        // Member数やRound数はクロスコンテキストなので、他のQueryServiceから取得してマージ
        return enrichWithCrossContextCounts(events)
    }

    private fun enrichWithCrossContextCounts(
        events: List<EventListItemDto>,
    ): List<EventListItemDto> {
        val eventIds = events.map { it.id }
        val memberCountByEvent = memberQueryPort.countByEventIds(eventIds)
        val roundCountByEvent = matchQueryPort.countRoundsByEventIds(eventIds)
        val hasMvpByEvent = mvpQueryPort.existsByEventIds(eventIds)

        return events.map {
            it.copy(
                memberCount = memberCountByEvent[it.id] ?: 0,
                roundCount = roundCountByEvent[it.id] ?: 0,
                hasMvpResult = hasMvpByEvent[it.id] ?: false,
            )
        }
    }
    // ...
}
```

### コンテキスト境界のルール

| 参照種別 | Read 側で許可 | 方法 |
|---|---|---|
| 同一コンテキストの JOIN | ○ | JPQL constructor expression |
| 他コンテキストの COUNT/EXISTS | △ (集計のみ) | 他コンテキストの QueryPort を呼び、アプリケーション層でマージ |
| 他コンテキストのデータ取得 | △ | 同上。直接 JOIN は禁止 |

**注意**: 他コンテキストを集計するために別途 `MemberQueryPort.countByEventIds(List<String>): Map<String, Int>` のような I/F を用意する。各コンテキストは自分のエンティティしか触らない。

---

## Presentation 層

### Command Controller

```kotlin
package com.salurec.event.presentation.controller

import com.salurec.event.application.command.usecase.*
import com.salurec.event.presentation.dto.request.*
import com.salurec.event.presentation.dto.response.*
import com.salurec.event.presentation.mapper.EventRequestMapper
import com.salurec.event.presentation.mapper.EventResponseMapper
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/events")
class EventCommandController(
    private val createEvent: CreateEventUseCase,
    private val startEvent: StartEventUseCase,
    private val finishEvent: FinishEventUseCase,
    private val reopenEvent: ReopenEventUseCase,
) {
    @PostMapping
    fun create(@RequestBody request: CreateEventRequest): CreateEventResponse {
        val result = createEvent.execute(EventRequestMapper.toCommand(request))
        return EventResponseMapper.toResponse(result)
    }

    @PostMapping("/{id}/start")
    fun start(@PathVariable id: String): ResponseEntity<Unit> {
        startEvent.execute(id)
        return ResponseEntity.ok().build()
    }
}
```

### Query Controller

```kotlin
package com.salurec.event.presentation.controller

import com.salurec.event.application.query.param.ListEventsQuery
import com.salurec.event.application.query.service.EventQueryService
import com.salurec.event.presentation.dto.response.EventListResponse
import com.salurec.event.presentation.dto.response.EventDetailResponse
import com.salurec.event.presentation.mapper.EventResponseMapper
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/events")
class EventQueryController(
    private val queryService: EventQueryService,
) {
    @GetMapping
    fun list(): EventListResponse =
        EventResponseMapper.toListResponse(queryService.list(ListEventsQuery()))

    @GetMapping("/{id}")
    fun detail(@PathVariable id: String): EventDetailResponse {
        val dto = queryService.findDetail(id)
            ?: throw EventNotFoundException(id)
        return EventResponseMapper.toDetailResponse(dto)
    }
}
```

---

## 共有カーネル (shared)

```
com.salurec.shared
├── domain/
│   ├── EntityId.kt                 ID型の基底 I/F
│   ├── DomainEvent.kt              ドメインイベント基底
│   ├── DomainEventPublisher.kt     I/F
│   ├── DomainException.kt
│   ├── IdGenerator.kt              I/F
│   └── Clock.kt                    時計 I/F
├── infrastructure/
│   ├── UuidIdGenerator.kt          UUID先頭8文字生成
│   ├── SystemClock.kt
│   └── SpringDomainEventPublisher.kt
└── web/
    ├── ApiErrorResponse.kt
    ├── GlobalExceptionHandler.kt
    └── SecurityConfig.kt
```

---

## アーキテクチャ境界テスト (ArchUnit)

オニオン × CQRS + JPA分離の規約を CI で強制する。

```kotlin
import com.tngtech.archunit.core.importer.ClassFileImporter
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.*
import org.junit.jupiter.api.Test

class LayerDependencyTest {
    private val classes = ClassFileImporter().importPackages("com.salurec")

    @Test
    fun `domain層はフレームワーク・JPAに依存しない`() {
        noClasses().that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "org.springframework..",
                "jakarta.persistence..",
                "org.hibernate..",
            )
            .check(classes)
    }

    @Test
    fun `JPA Entity は infrastructure.persistence.entity にしか存在しない`() {
        classes().that().areAnnotatedWith(jakarta.persistence.Entity::class.java)
            .should().resideInAPackage("..infrastructure.persistence.entity..")
            .check(classes)
    }

    @Test
    fun `domain層はapplication・infrastructure・presentationに依存しない`() {
        noClasses().that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "..application..",
                "..infrastructure..",
                "..presentation..",
            )
            .check(classes)
    }

    @Test
    fun `application層はinfrastructure・presentationに依存しない`() {
        noClasses().that().resideInAPackage("..application..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "..infrastructure..",
                "..presentation..",
            )
            .check(classes)
    }

    @Test
    fun `Command UseCase は Query パッケージに依存しない`() {
        noClasses().that().resideInAPackage("..application.command..")
            .should().dependOnClassesThat().resideInAPackage("..application.query..")
            .check(classes)
    }

    @Test
    fun `Query Service は Command パッケージに依存しない`() {
        noClasses().that().resideInAPackage("..application.query..")
            .should().dependOnClassesThat().resideInAPackage("..application.command..")
            .check(classes)
    }
}
```

---

## 認証・認可 (Identity & Access)

### フロー

```
[クライアント]                            [サーバー]
POST /api/auth/login-admin
  { password: "xxx" }          →    管理者パスワードと比較
                               ←    { token: "JWT...", role: "ADMIN" }

POST /api/auth/login-with-code
  { code: "ABCD" }             →    Event を join_code で検索
                               ←    { token: "JWT...", role: "USER", eventId }

GET /api/events/:id
  Authorization: Bearer JWT    →    JWT検証 → SecurityContextにロール設定
                                    → @PreAuthorize("hasRole('ADMIN') or (hasRole('USER') and @eventAccess.canAccess(...))")
                               ←    レスポンス
```

### JWT ペイロード

```json
{
  "sub": "admin" または "user:ABCD",
  "role": "ADMIN" または "USER",
  "eventId": "xxx",
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

## Gemini API 呼び出し

```kotlin
// mvp/infrastructure/gateway/GeminiClient.kt
@Component
class GeminiClient(
    @Value("\${gemini.api-key}") private val apiKey: String,
    @Value("\${gemini.model:gemini-2.0-flash-exp}") private val model: String,
    private val restClient: RestClient,
) {
    fun generate(prompt: String): String { ... }
}
```

- API KEY は環境変数 `GEMINI_API_KEY`
- タイムアウト: 30秒
- リトライ: Spring Retry で最大2回

---

## テスト戦略

| レイヤー | テスト種別 | ツール |
|---|---|---|
| domain | 単体テスト (純粋関数として) | JUnit 5 + Kotest |
| application.command | 単体テスト (Repository/Portモック) | JUnit 5 + MockK |
| application.query | 結合テスト推奨 (JPQL射影の正しさを実DBで) | Testcontainers |
| infrastructure.persistence | 結合テスト (実DB + SQL ログ検証で N+1 検出) | Testcontainers |
| presentation | API結合テスト | `@SpringBootTest` + `MockMvc` |
| architecture | レイヤー依存ルール検証 | ArchUnit |
| E2E | シナリオテスト | Playwright (frontend側) |

### N+1 の検出

Repository/QueryService の結合テスト時に SQL ログを検証する方法を推奨。
`datasource-proxy` や `p6spy` でクエリ数を記録し、想定した本数に収まっているかアサートする。

```kotlin
@Test
fun `Round取得時にMatchとMatchParticipantで追加クエリが発生しないこと`() {
    // ...
    val queryCount = queryCountInterceptor.getCount()
    assertThat(queryCount).isLessThanOrEqualTo(3)  // round + matches + participants
}
```

### Testcontainers 共通基盤

```kotlin
abstract class AbstractIntegrationTest {
    companion object {
        @Container
        @JvmStatic
        val postgres = PostgreSQLContainer("postgres:16-alpine")
            .apply { start() }

        @DynamicPropertySource
        @JvmStatic
        fun props(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl)
            registry.add("spring.datasource.username", postgres::getUsername)
            registry.add("spring.datasource.password", postgres::getPassword)
        }
    }
}
```

---

## スキーマ管理の方針

- **スキーマは Flyway で管理** する(詳細は `04-rdb-schema.md`)
- **`spring.jpa.hibernate.ddl-auto=validate`** に固定(`update` や `create` は禁止)
- JPA Entity と DB スキーマの整合は起動時に Hibernate が検証する
- `.gitignore` に Hibernate の `schema.sql` 自動生成物を入れておく

---

## build.gradle.kts 概要 (backend)

```kotlin
plugins {
    kotlin("jvm") version "2.0.20"
    kotlin("plugin.spring") version "2.0.20"
    kotlin("plugin.jpa") version "2.0.20"
    id("org.springframework.boot") version "3.3.5"
    id("io.spring.dependency-management") version "1.1.6"
    id("org.flywaydb.flyway") version "10.20.0"
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("io.hypersistence:hypersistence-utils-hibernate-63:3.8.3")  // JSONB型
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("org.postgresql:postgresql")
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("io.kotest:kotest-runner-junit5:5.9.1")
    testImplementation("io.mockk:mockk:1.13.13")
    testImplementation("org.testcontainers:postgresql:1.20.3")
    testImplementation("org.testcontainers:junit-jupiter:1.20.3")
    testImplementation("com.tngtech.archunit:archunit-junit5:1.3.0")
    testImplementation("p6spy:p6spy:3.9.1")  // N+1検出用
}

// kotlin-jpa プラグインが @Entity に no-arg コンストラクタを自動付与
allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}
```

---

## まとめ: 設計の鉄則

| # | ルール |
|---|---|
| 1 | Domain はフレームワークに依存しない (純粋 Kotlin、JPA アノテーションなし) |
| 2 | JPA Entity は `infrastructure.persistence.entity` にのみ配置する |
| 3 | 依存方向は外側→内側のみ (ArchUnit で強制) |
| 4 | Write は集約 + Repository 経由、Read は QueryService で直接 DTO 射影 |
| 5 | Fetch は基本 LAZY、必要なタイミングで明示的にロード |
| 6 | 層をまたぐ場合は Mapper で明示的に変換する (ドメイン ⇄ JPA Entity、Domain ⇄ Response DTO) |
| 7 | Command と Query は同じ application パッケージ内で物理的に分離 |
| 8 | 他コンテキスト呼び出しは Port 経由(アダプタで実装) |
| 9 | Read 側のクロスコンテキスト参照は集計 (COUNT/EXISTS) に限定、それ以外は QueryPort 経由でマージ |
| 10 | Controller は Command 用と Query 用を分割 |
| 11 | スキーマ管理は Flyway、`ddl-auto=validate` 固定 |
| 12 | N+1 は SQL ログ検証テストで機械的に検出 |
