package com.salurec.event.application.command.command

import java.time.LocalDate

/**
 * イベント作成コマンド。
 * 幹事が作成するフローの場合は `organizerName` を指定すると、
 * 作成と同時に幹事メンバーが登録される。
 */
data class CreateEventCommand(
    val name: String,
    val date: LocalDate,
    val organizerName: String? = null,
)
