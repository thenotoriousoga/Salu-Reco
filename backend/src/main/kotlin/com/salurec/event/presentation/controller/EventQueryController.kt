package com.salurec.event.presentation.controller

import com.salurec.event.application.exception.EventNotFoundException
import com.salurec.event.application.query.service.EventQueryService
import com.salurec.event.presentation.dto.response.EventDetailResponse
import com.salurec.event.presentation.dto.response.EventListItemResponse
import com.salurec.event.presentation.dto.response.EventListResponse
import com.salurec.identity.domain.model.AuthPrincipal
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import org.springframework.http.HttpStatus

/**
 * イベントクエリ(読み込み)Controller。
 * 認可は SecurityConfig で URL ベースに集約しているためここでは @PreAuthorize を使わない。
 * 動的認可(該当イベントに USER がアクセス可能か)は Controller 内で AuthPrincipal.canAccessEvent を使う。
 */
@RestController
@RequestMapping("/api/events")
class EventQueryController(
    private val eventQueryService: EventQueryService,
) {
    @GetMapping
    fun list(): EventListResponse {
        val items = eventQueryService.list().map { toListItemResponse(it) }
        return EventListResponse(events = items)
    }

    @GetMapping("/{id}")
    fun detail(
        @PathVariable id: String,
        @AuthenticationPrincipal principal: AuthPrincipal,
    ): EventDetailResponse {
        if (!principal.canAccessEvent(id)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "このイベントへのアクセス権限がありません")
        }
        val dto = eventQueryService.findDetail(id) ?: throw EventNotFoundException(id)
        return EventDetailResponse(
            id = dto.id,
            name = dto.name,
            date = dto.date,
            status = dto.status,
            joinCode = dto.joinCode,
        )
    }

    private fun toListItemResponse(dto: com.salurec.event.application.query.dto.EventListItemDto) =
        EventListItemResponse(
            id = dto.id,
            name = dto.name,
            date = dto.date,
            status = dto.status,
            joinCode = dto.joinCode,
        )
}
