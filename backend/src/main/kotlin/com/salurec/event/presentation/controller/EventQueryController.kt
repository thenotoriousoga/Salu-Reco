package com.salurec.event.presentation.controller

import com.salurec.event.application.exception.EventNotFoundException
import com.salurec.event.application.query.service.EventQueryService
import com.salurec.generated.api.EventQueryApi
import com.salurec.generated.model.EventDetailResponse
import com.salurec.generated.model.EventListItemResponse
import com.salurec.generated.model.EventListResponse
import com.salurec.identity.domain.model.AuthPrincipal
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

/**
 * イベントクエリ(読み込み)Controller。
 * 生成された EventQueryApi インターフェースを実装する。
 * 動的認可(該当イベントに USER がアクセス可能か)は Controller 内で AuthPrincipal.canAccessEvent を使う。
 */
@RestController
class EventQueryController(
    private val eventQueryService: EventQueryService,
) : EventQueryApi {

    override fun listEvents(): ResponseEntity<EventListResponse> {
        val items = eventQueryService.list().map { dto ->
            EventListItemResponse(
                id = dto.id,
                name = dto.name,
                date = dto.date,
                status = EventListItemResponse.Status.valueOf(dto.status),
                joinCode = dto.joinCode,
            )
        }
        return ResponseEntity.ok(EventListResponse(events = items))
    }

    override fun getEventDetail(eventId: String): ResponseEntity<EventDetailResponse> {
        // 動的認可: AuthPrincipal は SecurityContext から取得
        val principal = getAuthPrincipal()
        if (!principal.canAccessEvent(eventId)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "このイベントへのアクセス権限がありません")
        }
        val dto = eventQueryService.findDetail(eventId) ?: throw EventNotFoundException(eventId)
        return ResponseEntity.ok(
            EventDetailResponse(
                id = dto.id,
                name = dto.name,
                date = dto.date,
                status = EventDetailResponse.Status.valueOf(dto.status),
                joinCode = dto.joinCode,
            ),
        )
    }

    private fun getAuthPrincipal(): AuthPrincipal {
        val context = org.springframework.security.core.context.SecurityContextHolder.getContext()
        return context.authentication?.principal as? AuthPrincipal
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED)
    }
}
