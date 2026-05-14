# 永続化戦略

## Persistence Model 分離パターン

ドメインモデルと JPA Entity を完全に分離する。

```
[Domain Model] ─── Mapper ───> [JPA Entity] ── Hibernate ──> [Database]
  (純粋 Kotlin)                (永続化専用)
  data class, val              class, var, @Entity
```

| 項目 | ドメインモデル | JPA Entity |
|---|---|---|
| クラス修飾 | `data class` | `class`（Hibernate プロキシ対応） |
| フィールド | `val`（不変） | `var`（Hibernate が書き換え） |
| パッケージ | `domain/model/` | `infrastructure/persistence/entity/` |
| 依存 | Kotlin 標準のみ | `jakarta.persistence.*` |
| 振る舞い | ビジネスロジック | なし（永続化のみ） |
| 値オブジェクト | `value class` / `data class` | プリミティブ or `@Embedded` |

---

## JPA Entity の実装

```kotlin
package com.salurec.event.infrastructure.persistence.entity

import jakarta.persistence.*
import java.time.Instant
import java.time.LocalDate

@Entity
@Table(name = "events")
class EventJpaEntity(
    @Id
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    var id: String,

    @Column(name = "name", nullable = false, length = 100)
    var name: String,

    @Column(name = "event_date", nullable = false)
    var eventDate: LocalDate,

    @Column(name = "status", nullable = false, length = 20)
    var status: String,

    @Column(name = "join_code", nullable = false, unique = true, length = 5)
    var joinCode: String,

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
) {
    @PreUpdate
    fun onUpdate() {
        updatedAt = Instant.now()
    }
}
```

### JPA Entity のルール

- `data class` ではなく通常の `class`（Hibernate プロキシとの相性）
- 全フィールド `var`（Hibernate が書き換えるため）
- `kotlin("plugin.jpa")` で no-arg コンストラクタ自動生成
- `kotlin("plugin.allopen")` で `@Entity` クラスは自動 `open`
- ビジネスロジックは一切書かない

---

## Entity Mapper

Domain Model ⇄ JPA Entity の変換を担う。

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
    )

    fun toEntity(domain: Event): EventJpaEntity = EventJpaEntity(
        id = domain.id.value,
        name = domain.name.value,
        eventDate = domain.date,
        status = domain.status.name,
        joinCode = domain.joinCode.value,
    )

    /** 既存 Entity にドメインの状態を反映する（更新用） */
    fun applyDomain(entity: EventJpaEntity, domain: Event) {
        entity.name = domain.name.value
        entity.eventDate = domain.date
        entity.status = domain.status.name
    }
}
```

---

## Repository 実装

```kotlin
package com.salurec.event.infrastructure.persistence.repository

import com.salurec.event.domain.model.*
import com.salurec.event.domain.port.EventRepository
import com.salurec.event.infrastructure.persistence.mapper.EventEntityMapper
import org.springframework.stereotype.Repository

@Repository
class EventRepositoryImpl(
    private val jpaRepository: EventJpaRepository,
) : EventRepository {

    override fun save(event: Event): Event {
        val existing = jpaRepository.findById(event.id.value).orElse(null)
        val entity = if (existing != null) {
            EventEntityMapper.applyDomain(existing, event)
            existing  // dirty checking に任せる
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

---

## 子エンティティを含む集約の永続化

Match 集約のように子コレクション（participants, goals）を持つ場合。

### JPA Entity の関連

```kotlin
@Entity
@Table(name = "matches")
class MatchJpaEntity(
    @Id var id: String,
    @Column(name = "round_id", nullable = false) var roundId: String,
    @Column(name = "match_number", nullable = false) var matchNumber: Int,
    @Column(name = "team_a_name", nullable = false) var teamAName: String,
    @Column(name = "team_b_name", nullable = false) var teamBName: String,
    @Column(name = "status", nullable = false) var status: String,

    @OneToMany(
        mappedBy = "match",
        cascade = [CascadeType.ALL],
        orphanRemoval = true,
        fetch = FetchType.LAZY,
    )
    var participants: MutableList<MatchParticipantJpaEntity> = mutableListOf(),

    @OneToMany(
        mappedBy = "match",
        cascade = [CascadeType.ALL],
        orphanRemoval = true,
        fetch = FetchType.LAZY,
    )
    @OrderBy("createdAt ASC")
    var goals: MutableList<GoalJpaEntity> = mutableListOf(),
)
```

**注意**: Round と Match は独立集約 (ADR-004)。Round は Match を子コレクションとして持たない。
Round の `team_assignment` は JSONB カラムで保持する。

### Round の JSONB マッピング

```kotlin
@Entity
@Table(name = "rounds")
class RoundJpaEntity(
    @Id var id: String,
    @Column(name = "event_id", nullable = false) var eventId: String,
    @Column(name = "round_number", nullable = false) var roundNumber: Int,
    @Column(name = "status", nullable = false) var status: String,

    @Column(name = "team_assignment", columnDefinition = "jsonb", nullable = false)
    @Convert(converter = TeamAssignmentConverter::class)
    var teamAssignment: String,  // JSON 文字列として保持
)
```

### 子コレクションの差分反映

```kotlin
object MatchEntityMapper {
    fun applyDomain(entity: MatchJpaEntity, domain: Match) {
        entity.status = domain.status.name
        entity.teamAName = domain.teamAName.value
        entity.teamBName = domain.teamBName.value

        // participants の差分反映
        val incomingParticipantIds = domain.participants.map { it.memberId.value }.toSet()
        val toRemove = entity.participants.filter { it.memberId !in incomingParticipantIds }
        entity.participants.removeAll(toRemove)

        val existingByMemberId = entity.participants.associateBy { it.memberId }
        domain.participants.forEach { domainParticipant ->
            if (domainParticipant.memberId.value !in existingByMemberId) {
                entity.participants.add(
                    MatchParticipantEntityMapper.toEntity(domainParticipant, entity.id)
                )
            }
        }

        // goals の差分反映
        val incomingGoalIds = domain.goals.map { it.id.value }.toSet()
        entity.goals.removeAll { it.id !in incomingGoalIds }

        val existingGoalById = entity.goals.associateBy { it.id }
        domain.goals.forEach { domainGoal ->
            if (domainGoal.id.value !in existingGoalById) {
                entity.goals.add(GoalEntityMapper.toEntity(domainGoal, entity.id))
            }
        }
    }
}
```

---

## Fetch 戦略

| 方針 | 詳細 |
|---|---|
| デフォルト | すべて `FetchType.LAZY` |
| ロードタイミング | トランザクション内で Mapper が子コレクションをトラバース |
| 最適化 | N+1 が問題になったら `@EntityGraph` / `JOIN FETCH` を追加 |
| 検証 | Testcontainers 統合テストで SQL ログを検証 |

---

## Query Service 実装（Read 側）

集約を経由せず、JPQL で直接 DTO に射影する。

```kotlin
package com.salurec.event.infrastructure.persistence.query

import com.salurec.event.application.query.EventQueryService
import com.salurec.event.application.query.dto.EventListItemDto
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Service

@Service
class EventQueryServiceImpl(
    private val em: EntityManager,
    private val memberQueryPort: MemberQueryPort,
) : EventQueryService {

    override fun list(): List<EventListItemDto> {
        val jpql = """
            SELECT new com.salurec.event.application.query.dto.EventListItemDto(
                e.id, e.name, e.eventDate, e.status, e.joinCode
            )
            FROM EventJpaEntity e
            ORDER BY e.eventDate DESC, e.createdAt DESC
        """.trimIndent()

        val events = em.createQuery(jpql, EventListItemDto::class.java).resultList

        // 他コンテキストのデータはポート経由でマージ
        return enrichWithCrossContextData(events)
    }

    private fun enrichWithCrossContextData(
        events: List<EventListItemDto>,
    ): List<EventListItemDto> {
        val eventIds = events.map { it.id }
        val memberCounts = memberQueryPort.countByEventIds(eventIds)
        return events.map { it.copy(memberCount = memberCounts[it.id] ?: 0) }
    }
}
```

---

## スキーマ管理

| 項目 | 方針 |
|---|---|
| マイグレーションツール | Flyway |
| `ddl-auto` | `validate`（起動時に JPA Entity と DB スキーマの整合を検証） |
| `update` / `create` | **禁止**（本番事故防止） |
| マイグレーションファイル | `src/main/resources/db/migration/V{version}__{description}.sql` |
