package com.salurec.event.presentation.controller

import com.salurec.event.application.dto.CreateEventCommand
import com.salurec.event.application.command.CreateEventUseCase
import com.salurec.event.application.command.FinishEventUseCase
import com.salurec.event.application.command.ReopenEventUseCase
import com.salurec.event.application.command.StartEventUseCase
import com.salurec.generated.api.EventCommandApi
import com.salurec.generated.model.CreateEventRequest
import com.salurec.generated.model.CreateEventResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

/**
 * イベントコマンド(書き込み)Controller。
 * 生成された EventCommandApi インターフェースを実装する。
 * 認可は SecurityConfig で URL ベースに集約しているためここでは @PreAuthorize を使わない。
 */
@RestController
class EventCommandController(
    private val createEventUseCase: CreateEventUseCase,
    private val startEventUseCase: StartEventUseCase,
    private val finishEventUseCase: FinishEventUseCase,
    private val reopenEventUseCase: ReopenEventUseCase,
) : EventCommandApi {

    override fun createEvent(createEventRequest: CreateEventRequest): ResponseEntity<CreateEventResponse> {
        val command = CreateEventCommand(
            name = createEventRequest.name,
            date = createEventRequest.date,
            organizerName = createEventRequest.organizerName ?: "",
        )
        val result = createEventUseCase.execute(command)
        val body = CreateEventResponse(
            eventId = result.eventId.value,
            joinCode = result.joinCode.value,
            organizerMemberId = result.organizerMemberId,
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(body)
    }

    override fun startEvent(eventId: String): ResponseEntity<Unit> {
        startEventUseCase.execute(eventId)
        return ResponseEntity.noContent().build()
    }

    override fun finishEvent(eventId: String): ResponseEntity<Unit> {
        finishEventUseCase.execute(eventId)
        return ResponseEntity.noContent().build()
    }

    override fun reopenEvent(eventId: String): ResponseEntity<Unit> {
        reopenEventUseCase.execute(eventId)
        return ResponseEntity.noContent().build()
    }
}
