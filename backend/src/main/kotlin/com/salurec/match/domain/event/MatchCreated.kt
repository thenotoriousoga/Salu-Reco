package com.salurec.match.domain.event

import com.salurec.match.domain.model.MatchId
import com.salurec.match.domain.model.RoundId
import com.salurec.shared.domain.DomainEvent
import java.time.Instant

/**
 * 試合が新規作成されたことを表すドメインイベント。
 */
data class MatchCreated(
    val matchId: MatchId,
    val roundId: RoundId,
    override val occurredAt: Instant = Instant.now(),
) : DomainEvent
