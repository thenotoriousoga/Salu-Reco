package com.salurec.event.application.command.result

import com.salurec.event.domain.model.EventId
import com.salurec.event.domain.model.JoinCode

/**
 * イベント作成結果。
 */
data class CreateEventResult(
    val eventId: EventId,
    val joinCode: JoinCode,
)
