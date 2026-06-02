package com.salurec.match.domain.event

import com.salurec.match.domain.model.MatchId
import com.salurec.match.domain.model.RoundId
import com.salurec.shared.domain.DomainEvent
import java.time.Instant

/**
 * 試合が再開されたことを表すドメインイベント。
 */
data class MatchReopened(
    val matchId: MatchId,
    val roundId: RoundId,
    override val occurredAt: Instant = Instant.now(),
) : DomainEvent
