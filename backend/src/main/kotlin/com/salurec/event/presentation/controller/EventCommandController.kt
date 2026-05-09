package com.salurec.event.presentation.controller

import com.salurec.event.application.command.command.CreateEventCommand
import com.salurec.event.application.command.usecase.CreateEventUseCase
import com.salurec.event.application.command.usecase.FinishEventUseCase
import com.salurec.event.application.command.usecase.ReopenEventUseCase
import com.salurec.event.application.command.usecase.StartEventUseCase
import com.salurec.event.presentation.dto.request.CreateEventRequest
import com.salurec.event.presentation.dto.response.CreateEventResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * イベントコマンド(書き込み)Controller。
 * 認可は SecurityConfig で URL ベースに集約しているためここでは @PreAuthorize を使わない。
 */
@RestController
@RequestMapping("/api/events")
class EventCommandController(
    private val createEventUseCase: CreateEventUseCase,
    private val startEventUseCase: StartEventUseCase,
    private val finishEventUseCase: FinishEventUseCase,
    private val reopenEventUseCase: ReopenEventUseCase,
) {
    @PostMapping
    fun create(@Valid @RequestBody request: CreateEventRequest): ResponseEntity<CreateEventResponse> {
        val command = CreateEventCommand(
            name = request.name,
            date = request.date!!,
            organizerName = request.organizerName,
        )
        val result = createEventUseCase.execute(command)
        val body = CreateEventResponse(
            eventId = result.eventId.value,
            joinCode = result.joinCode.value,
            organizerMemberId = result.organizerMemberId,
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(body)
    }

    @PostMapping("/{id}/start")
    fun start(@PathVariable id: String): ResponseEntity<Unit> {
        startEventUseCase.execute(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{id}/finish")
    fun finish(@PathVariable id: String): ResponseEntity<Unit> {
        finishEventUseCase.execute(id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{id}/reopen")
    fun reopen(@PathVariable id: String): ResponseEntity<Unit> {
        reopenEventUseCase.execute(id)
        return ResponseEntity.noContent().build()
    }
}
