package com.salurec.event.domain.event

import com.salurec.event.domain.model.EventId
import com.salurec.shared.domain.DomainEvent
import java.time.Instant

/**
 * イベントが新規作成されたことを表すドメインイベント。
 */
data class EventCreated(
    val eventId: EventId,
    override val occurredAt: Instant = Instant.now(),
) : DomainEvent
