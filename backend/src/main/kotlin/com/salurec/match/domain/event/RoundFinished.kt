package com.salurec.match.domain.event

import com.salurec.match.domain.model.RoundId
import com.salurec.shared.domain.DomainEvent
import java.time.Instant

/**
 * ラウンドが終了したことを表すドメインイベント。
 */
data class RoundFinished(
    val roundId: RoundId,
    override val occurredAt: Instant = Instant.now(),
) : DomainEvent
