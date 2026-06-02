package com.salurec.match.application.query.dto

/**
 * MVP 評価用の試合データ Read Model。Phase 6 で使用する。
 */
data class MatchDataDto(
    val matchId: String,
    val roundId: String,
    val teamAName: String,
    val teamBName: String,
    val scoreA: Int,
    val scoreB: Int,
    val goals: List<GoalDataDto>,
    val participants: List<ParticipantDataDto>,
) {
    data class GoalDataDto(
        val scorerId: String?,
        val team: String,
        val type: String,
    )

    data class ParticipantDataDto(
        val memberId: String,
        val team: String,
        val isSubstitute: Boolean,
    )
}
