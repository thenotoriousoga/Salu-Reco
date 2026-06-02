package com.salurec.match.application.dto

import com.salurec.match.domain.model.GoalType
import com.salurec.match.domain.model.MatchTeam

/**
 * 得点記録コマンド。
 */
data class RecordGoalCommand(
    val matchId: String,
    val team: MatchTeam,
    val scorerId: String?,
    val type: GoalType,
)
