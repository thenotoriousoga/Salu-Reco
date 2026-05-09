package com.salurec.member.application.query.service

import com.salurec.member.application.query.dto.MemberListItemDto

interface MemberQueryService {
    fun listByEvent(eventId: String): List<MemberListItemDto>
}
