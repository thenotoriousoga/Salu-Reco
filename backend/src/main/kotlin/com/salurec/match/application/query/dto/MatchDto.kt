package com.salurec.match.application.query.dto

/**
 * 試合詳細の Read Model。
 */
data class MatchDto(
    val id: String,
    val roundId: String,
    val matchNumber: Int,
    val teamAName: String,
    val teamBName: String,
    val status: String,
    val scoreA: Int,
    val scoreB: Int,
    val participants: List<ParticipantDto>,
    val goals: List<GoalDto>,
) {
    data class ParticipantDto(
        val memberId: String,
        val team: String,
        val isSubstitute: Boolean,
    )

    data class GoalDto(
        val id: String,
        val team: String,
        val scorerId: String?,
        val type: String,
    )
}
