package com.salurec.event.application.query.dto

import java.time.LocalDate

/**
 * イベント詳細画面用の ReadModel。
 * Phase 3 時点では Event 集約の情報のみ返す。
 * Phase 4 以降でメンバー情報・ラウンド情報・MVP 結果などを追加する。
 */
data class EventDetailDto(
    val id: String,
    val name: String,
    val date: LocalDate,
    val status: String,
    val joinCode: String,
)
