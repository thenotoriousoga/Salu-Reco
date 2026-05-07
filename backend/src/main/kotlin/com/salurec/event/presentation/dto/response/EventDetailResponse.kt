package com.salurec.event.presentation.dto.response

import java.time.LocalDate

/**
 * イベント詳細レスポンス。
 */
data class EventDetailResponse(
    val id: String,
    val name: String,
    val date: LocalDate,
    val status: String,
    val joinCode: String,
)
