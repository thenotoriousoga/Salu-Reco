package com.salurec.member.presentation.controller

import com.salurec.identity.domain.model.AuthPrincipal
import com.salurec.member.application.query.service.MemberQueryService
import com.salurec.member.presentation.dto.MemberListResponse
import com.salurec.member.presentation.dto.MemberResponse
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/events/{eventId}/members")
class MemberQueryController(
    private val memberQueryService: MemberQueryService,
) {
    @GetMapping
    fun list(
        @PathVariable eventId: String,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): MemberListResponse {
        if (!principal.canAccessEvent(eventId)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "このイベントへのアクセス権限がありません")
        }
        val items = memberQueryService.listByEvent(eventId).map {
            MemberResponse(
                id = it.id,
                eventId = it.eventId,
                name = it.name,
                seniorityYear = it.seniorityYear,
                soccerExperience = it.soccerExperience,
                isOrganizer = it.isOrganizer,
                note = it.note,
                enthusiasm = it.enthusiasm,
            )
        }
        return MemberListResponse(items)
    }
}
