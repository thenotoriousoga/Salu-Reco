# Domain 層の実装パターン

## 基本方針

- Domain 層は **純粋 Kotlin** で記述する。フレームワーク依存ゼロ
- ビジネスロジックは Entity（集約ルート）に凝集させる（Anemic Domain Model を避ける）
- 状態変更は集約ルートのメソッド経由のみ。外部から直接フィールドを書き換えない
- 集約は不変（immutable）な `data class` で表現し、`copy()` で新しい状態を返す

---

## Entity（集約ルート）

### 実装パターン

```kotlin
package com.salurec.event.domain.model

data class Event(
    val id: EventId,
    val name: EventName,
    val date: LocalDate,
    val status: EventStatus,
    val joinCode: JoinCode,
) {
    // ビジネスルールを集約ルートが守る
    fun start(memberCount: Int): Event {
        check(status == EventStatus.Preparing) { "準備中のイベントのみ開始できます" }
        require(memberCount >= 2) { "メンバーを2名以上登録してください" }
        return copy(status = EventStatus.InProgress)
    }

    fun finish(hasOngoingRound: Boolean): Event {
        check(status == EventStatus.InProgress) { "進行中のイベントのみ終了できます" }
        require(!hasOngoingRound) { "進行中のラウンドがあります" }
        return copy(status = EventStatus.Finished)
    }

    fun reopen(): Event {
        check(status == EventStatus.Finished) { "終了状態のイベントのみ再開できます" }
        return copy(status = EventStatus.InProgress)
    }
}
```

### 設計ルール

| ルール | 理由 |
|---|---|
| `data class` + `val` プロパティ | 不変性の保証。スレッドセーフ |
| 状態遷移は新しいインスタンスを返す | 副作用なし。テストしやすい |
| `check()` / `require()` で不変条件を守る | ドメインルール違反を即座に検出 |
| 外部 I/O を呼ばない | 純粋関数としてテスト可能 |

---

## Value Object（値オブジェクト）

### `value class` パターン（単一値）

```kotlin
@JvmInline
value class EventId(override val value: String) : EntityId {
    init {
        require(value.isNotBlank()) { "EventId は空にできません" }
    }
}

@JvmInline
value class EventName(val value: String) {
    init {
        require(value.isNotBlank()) { "イベント名を入力してください" }
        require(value.length <= 100) { "イベント名は100文字以内です" }
    }
}
```

### `data class` パターン（複合値）

```kotlin
data class TeamAssignment(
    val teams: List<Team>,
) {
    init {
        require(teams.size >= 2) { "チームは2つ以上必要です" }
    }
}

data class Team(
    val teamNumber: Int,
    val memberIds: List<MemberId>,
) {
    init {
        require(memberIds.size >= 2) { "1チーム最低2人必要です" }
    }
}
```

### 設計ルール

| ルール | 理由 |
|---|---|
| `value class` は単一プリミティブのラッパー | 型安全性 + ランタイムオーバーヘッドなし |
| `init` ブロックでバリデーション | 不正な値の生成を防止 |
| 等価性は値で判定（`data class` / `value class` の標準動作） | ID を持たない |
| setter なし（`val` のみ） | 不変性の保証 |

---

## Domain Event（ドメインイベント）

集約内で起きた事実を記録する。過去形で命名する。

```kotlin
package com.salurec.event.domain.event

import com.salurec.event.domain.model.EventId
import com.salurec.shared.domain.DomainEvent
import java.time.Instant

data class EventCreated(
    val eventId: EventId,
    override val occurredAt: Instant = Instant.now(),
) : DomainEvent

data class EventFinished(
    val eventId: EventId,
    override val occurredAt: Instant = Instant.now(),
) : DomainEvent
```

### 発行タイミング

- ドメインイベントは **Application 層の UseCase** が発行する
- Domain 層はイベントの「定義」のみを持つ（発行の仕組みには依存しない）
- 初期実装ではインプロセスの同期発行（Spring の `ApplicationEventPublisher`）

---

## Repository Interface（Driven Port）

集約ルート単位で定義する。テーブル単位ではない。

```kotlin
package com.salurec.event.domain.port

import com.salurec.event.domain.model.*

/**
 * Event 集約の永続化ポート。
 * Write 側のみ。Read は QueryService を使う。
 */
interface EventRepository {
    fun save(event: Event): Event
    fun findById(id: EventId): Event?
    fun findByJoinCode(code: JoinCode): Event?
    fun existsByJoinCode(code: JoinCode): Boolean
    fun delete(id: EventId)
}
```

### 設計ルール

| ルール | 理由 |
|---|---|
| 集約ルートごとに 1 Repository | 集約境界の尊重 |
| 戻り値はドメインモデル | Infrastructure の詳細を漏らさない |
| Write 専用 | Read は QueryService で分離 |
| `findById` は `null` を返す | 例外スローは UseCase の責務 |

---

## Domain Service

単一の集約に属さないステートレスなドメインロジック。

```kotlin
package com.salurec.match.domain.service

import com.salurec.match.domain.model.*

/**
 * チーム分けロジック。
 * 複数メンバーの情報を使うため、Member 集約にも Round 集約にも属さない。
 */
interface TeamSplitService {
    fun split(
        members: List<MemberForSplit>,
        teamCount: Int,
        existingTeams: List<Team>? = null,
    ): TeamAssignment
}

data class MemberForSplit(
    val memberId: MemberId,
    val soccerExperience: SoccerExperience,
)
```

### Domain Service を使う判断基準

```
ロジックの配置先は？
├─ 1つの集約の状態だけで判断できる → 集約ルートのメソッド
├─ 複数集約の情報が必要 + ステートレス → Domain Service
└─ 外部システムとの連携が必要 → Application 層 (UseCase)
```

---

## Domain Exception

```kotlin
package com.salurec.shared.domain

abstract class DomainException(
    message: String,
    cause: Throwable? = null,
) : RuntimeException(message, cause)
```

```kotlin
package com.salurec.event.domain.exception

import com.salurec.shared.domain.DomainException

class EventNotFoundException(eventId: String) :
    DomainException("イベントが見つかりません: $eventId")

class InvalidEventStateException(message: String) :
    DomainException(message)
```

---

## Shared Kernel（共有カーネル）

コンテキスト間で共有する最小限の型。

```kotlin
// com.salurec.shared.domain

interface EntityId {
    val value: String
}

interface DomainEvent {
    val occurredAt: Instant
}

interface DomainEventPublisher {
    fun publish(event: DomainEvent)
    fun publishAll(events: List<DomainEvent>)
}

interface IdGenerator {
    fun generate(): String
}

interface Clock {
    fun now(): Instant
    fun today(): LocalDate
}
```

**共有カーネルに含めてよいもの**:
- ID 型の基底インターフェース
- DomainEvent 基底
- DomainException 基底
- IdGenerator, Clock などのユーティリティポート

**含めてはいけないもの**:
- 特定コンテキストのドメインモデル
- ビジネスロジック
