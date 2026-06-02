package com.salurec.match.application.dto

import com.salurec.match.domain.model.MatchTeam

/**
 * 助っ人追加コマンド。
 */
data class AddSubstituteCommand(
    val matchId: String,
    val memberId: String,
    val team: MatchTeam,
)
