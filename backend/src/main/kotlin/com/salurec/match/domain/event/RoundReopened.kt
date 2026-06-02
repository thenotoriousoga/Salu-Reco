package com.salurec.match.domain.event

import com.salurec.match.domain.model.RoundId
import com.salurec.shared.domain.DomainEvent
import java.time.Instant

/**
 * ラウンドが再開されたことを表すドメインイベント。
 */
data class RoundReopened(
    val roundId: RoundId,
    override val occurredAt: Instant = Instant.now(),
) : DomainEvent
