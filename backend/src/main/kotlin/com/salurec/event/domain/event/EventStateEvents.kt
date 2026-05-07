package com.salurec.event.domain.event

import com.salurec.event.domain.model.EventId
import com.salurec.shared.domain.DomainEvent
import java.time.Instant

/** イベントが進行中になった */
data class EventStarted(
    val eventId: EventId,
    override val occurredAt: Instant = Instant.now(),
) : DomainEvent

/** イベントが終了した。MVP Evaluation 側で「選出可能」状態を認知する */
data class EventFinished(
    val eventId: EventId,
    override val occurredAt: Instant = Instant.now(),
) : DomainEvent

/** イベント終了状態から進行中に戻した */
data class EventReopened(
    val eventId: EventId,
    override val occurredAt: Instant = Instant.now(),
) : DomainEvent
