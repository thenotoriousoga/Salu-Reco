package com.salurec.match.application.query.dto

/**
 * ラウンド詳細の Read Model。
 */
data class RoundDto(
    val id: String,
    val eventId: String,
    val roundNumber: Int,
    val status: String,
    val teams: List<TeamDto>,
) {
    data class TeamDto(
        val name: String,
        val memberIds: List<String>,
        val captainId: String?,
    )
}
