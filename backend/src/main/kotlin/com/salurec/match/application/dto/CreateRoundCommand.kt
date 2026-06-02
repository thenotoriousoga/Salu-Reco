package com.salurec.match.application.dto

/**
 * ラウンド作成コマンド。
 */
data class CreateRoundCommand(
    val eventId: String,
    val teamCount: Int,
    val memberIds: List<String>,
)
