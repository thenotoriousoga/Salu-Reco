package com.salurec.event.presentation.controller

import com.salurec.event.application.query.service.EventQueryService
import com.salurec.event.presentation.dto.response.EventListItemResponse
import com.salurec.event.presentation.dto.response.EventListResponse
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * イベントクエリ(読み込み)Controller。
 */
@RestController
@RequestMapping("/api/events")
class EventQueryController(
    private val eventQueryService: EventQueryService,
) {
    @GetMapping
    fun list(): EventListResponse {
        val items = eventQueryService.list().map {
            EventListItemResponse(
                id = it.id,
                name = it.name,
                date = it.date,
                status = it.status,
                joinCode = it.joinCode,
            )
        }
        return EventListResponse(events = items)
    }
}
