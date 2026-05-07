package com.salurec.event.presentation.dto.response

/**
 * イベント作成レスポンス。
 */
data class CreateEventResponse(
    val eventId: String,
    val joinCode: String,
)
