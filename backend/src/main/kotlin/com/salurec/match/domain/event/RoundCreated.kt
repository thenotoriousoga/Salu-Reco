package com.salurec.match.domain.event

import com.salurec.event.domain.model.EventId
import com.salurec.match.domain.model.RoundId
import com.salurec.shared.domain.DomainEvent
import java.time.Instant

/**
 * ラウンドが新規作成されたことを表すドメインイベント。
 */
data class RoundCreated(
    val roundId: RoundId,
    val eventId: EventId,
    override val occurredAt: Instant = Instant.now(),
) : DomainEvent
