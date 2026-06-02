package com.salurec.match.application.dto

import com.salurec.match.domain.model.MatchTeam

/**
 * 試合作成コマンド。
 */
data class CreateMatchCommand(
    val roundId: String,
    val teamAName: String,
    val teamBName: String,
    val participants: List<ParticipantInput>,
) {
    /**
     * 参加者の入力情報。
     */
    data class ParticipantInput(
        val memberId: String,
        val team: MatchTeam,
    )
}
