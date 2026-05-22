package com.salurec.event.application.dto

import com.salurec.event.domain.model.EventId
import com.salurec.event.domain.model.JoinCode

data class CreateEventResult(
    val eventId: EventId,
    val joinCode: JoinCode,
    /** 幹事名を指定した場合に登録された幹事メンバーの ID。指定されなかった場合は null */
    val organizerMemberId: String? = null,
)
