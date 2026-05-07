package com.salurec.event.presentation.controller

import com.salurec.event.application.command.command.CreateEventCommand
import com.salurec.event.application.command.usecase.CreateEventUseCase
import com.salurec.event.presentation.dto.request.CreateEventRequest
import com.salurec.event.presentation.dto.response.CreateEventResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * イベントコマンド(書き込み)Controller。
 */
@RestController
@RequestMapping("/api/events")
class EventCommandController(
    private val createEventUseCase: CreateEventUseCase,
) {
    @PostMapping
    fun create(@Valid @RequestBody request: CreateEventRequest): ResponseEntity<CreateEventResponse> {
        val command = CreateEventCommand(
            name = request.name,
            date = request.date!!,
        )
        val result = createEventUseCase.execute(command)
        val body = CreateEventResponse(
            eventId = result.eventId.value,
            joinCode = result.joinCode.value,
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(body)
    }
}
