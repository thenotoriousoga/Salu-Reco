package com.salurec.event.application.command.command

import java.time.LocalDate

/**
 * イベント作成コマンド。
 *
 * Phase 1 時点では Event 単体の作成のみ。
 * 幹事メンバー自動登録は Phase 4 で追加する。
 */
data class CreateEventCommand(
    val name: String,
    val date: LocalDate,
)
