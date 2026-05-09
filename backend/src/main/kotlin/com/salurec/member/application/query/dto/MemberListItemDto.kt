package com.salurec.member.application.query.dto

/**
 * メンバー一覧の ReadModel。
 */
data class MemberListItemDto(
    val id: String,
    val eventId: String,
    val name: String,
    val seniorityYear: Int,
    val soccerExperience: String,
    val isOrganizer: Boolean,
    val note: String,
    val enthusiasm: String,
)
