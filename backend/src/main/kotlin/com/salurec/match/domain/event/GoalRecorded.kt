package com.salurec.match.domain.event

import com.salurec.match.domain.model.GoalId
import com.salurec.match.domain.model.MatchId
import com.salurec.shared.domain.DomainEvent
import java.time.Instant

/**
 * 得点が記録されたことを表すドメインイベント。
 */
data class GoalRecorded(
    val matchId: MatchId,
    val goalId: GoalId,
    override val occurredAt: Instant = Instant.now(),
) : DomainEvent
