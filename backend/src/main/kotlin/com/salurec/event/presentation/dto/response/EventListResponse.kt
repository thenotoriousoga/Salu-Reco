package com.salurec.event.presentation.dto.response

import java.time.LocalDate

/**
 * イベント一覧レスポンス。
 */
data class EventListResponse(
    val events: List<EventListItemResponse>,
)

data class EventListItemResponse(
    val id: String,
    val name: String,
    val date: LocalDate,
    val status: String,
    val joinCode: String,
)
