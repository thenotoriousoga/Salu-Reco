package com.salurec.event.application.query.dto

import java.time.LocalDate

/**
 * イベント一覧画面用の ReadModel。
 * ドメインモデル Event ではなく、画面要件に合わせた形で返す。
 *
 * Phase 1 時点では Event 単体で完結する項目のみ。
 * memberCount / roundCount / hasMvpResult は Phase 4 以降で他コンテキストからマージする。
 */
data class EventListItemDto(
    val id: String,
    val name: String,
    val date: LocalDate,
    val status: String,
    val joinCode: String,
)
