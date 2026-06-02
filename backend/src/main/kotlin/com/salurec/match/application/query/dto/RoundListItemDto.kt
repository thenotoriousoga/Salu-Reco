package com.salurec.match.application.query.dto

/**
 * ラウンド一覧用の Read Model。
 */
data class RoundListItemDto(
    val id: String,
    val roundNumber: Int,
    val status: String,
    val teamCount: Int,
)
