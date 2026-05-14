package com.salurec.member.presentation.controller

import com.salurec.generated.api.MemberQueryApi
import com.salurec.generated.model.MemberListResponse
import com.salurec.generated.model.MemberResponse
import com.salurec.identity.domain.model.AuthPrincipal
import com.salurec.member.application.query.service.MemberQueryService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

@RestController
class MemberQueryController(
    private val memberQueryService: MemberQueryService,
) : MemberQueryApi {

    override fun listMembers(eventId: String): ResponseEntity<MemberListResponse> {
        val principal = getAuthPrincipal()
        if (!principal.canAccessEvent(eventId)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "このイベントへのアクセス権限がありません")
        }
        val items = memberQueryService.listByEvent(eventId).map {
            MemberResponse(
                id = it.id,
                eventId = it.eventId,
                name = it.name,
                seniorityYear = it.seniorityYear,
                soccerExperience = MemberResponse.SoccerExperience.valueOf(it.soccerExperience),
                isOrganizer = it.isOrganizer,
                note = it.note,
                enthusiasm = it.enthusiasm,
            )
        }
        return ResponseEntity.ok(MemberListResponse(items))
    }

    private fun getAuthPrincipal(): AuthPrincipal {
        val context = org.springframework.security.core.context.SecurityContextHolder.getContext()
        return context.authentication?.principal as? AuthPrincipal
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED)
    }
}
