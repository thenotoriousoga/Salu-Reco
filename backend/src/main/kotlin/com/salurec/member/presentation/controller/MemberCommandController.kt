package com.salurec.member.presentation.controller

import com.salurec.member.application.command.command.BulkRegisterMembersCommand
import com.salurec.member.application.command.command.RegisterMemberInput
import com.salurec.member.application.command.command.UpdateEnthusiasmCommand
import com.salurec.member.application.command.command.UpdateMemberCommand
import com.salurec.member.application.command.usecase.BulkRegisterMembersUseCase
import com.salurec.member.application.command.usecase.DeleteMemberUseCase
import com.salurec.member.application.command.usecase.UpdateEnthusiasmUseCase
import com.salurec.member.application.command.usecase.UpdateMemberUseCase
import com.salurec.member.presentation.dto.BulkRegisterMembersRequest
import com.salurec.member.presentation.dto.BulkRegisterMembersResponse
import com.salurec.member.presentation.dto.UpdateEnthusiasmRequest
import com.salurec.member.presentation.dto.UpdateMemberRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * メンバーコマンド Controller。
 */
@RestController
@RequestMapping("/api/events/{eventId}/members")
class MemberCommandController(
    private val bulkRegister: BulkRegisterMembersUseCase,
    private val updateMember: UpdateMemberUseCase,
    private val updateEnthusiasm: UpdateEnthusiasmUseCase,
    private val deleteMember: DeleteMemberUseCase,
) {
    @PostMapping
    fun registerBulk(
        @PathVariable eventId: String,
        @Valid @RequestBody request: BulkRegisterMembersRequest,
    ): ResponseEntity<BulkRegisterMembersResponse> {
        val command = BulkRegisterMembersCommand(
            eventId = eventId,
            members = request.members.map {
                RegisterMemberInput(
                    name = it.name,
                    seniorityYear = it.seniorityYear,
                    soccerExperience = it.soccerExperience,
                    isOrganizer = it.organizerFlag(),
                    note = it.noteOrEmpty(),
                )
            },
        )
        val ids = bulkRegister.execute(command)
        return ResponseEntity.status(HttpStatus.CREATED).body(BulkRegisterMembersResponse(ids))
    }

    @PutMapping("/{memberId}")
    fun update(
        @PathVariable eventId: String,
        @PathVariable memberId: String,
        @Valid @RequestBody request: UpdateMemberRequest,
    ): ResponseEntity<Unit> {
        updateMember.execute(
            UpdateMemberCommand(
                memberId = memberId,
                name = request.name,
                seniorityYear = request.seniorityYear,
                soccerExperience = request.soccerExperience,
                isOrganizer = request.organizerFlag(),
                note = request.noteOrEmpty(),
                enthusiasm = request.enthusiasm,
            ),
        )
        return ResponseEntity.noContent().build()
    }

    @PutMapping("/{memberId}/enthusiasm")
    fun updateEnthusiasmApi(
        @PathVariable eventId: String,
        @PathVariable memberId: String,
        @Valid @RequestBody request: UpdateEnthusiasmRequest,
    ): ResponseEntity<Unit> {
        updateEnthusiasm.execute(
            UpdateEnthusiasmCommand(memberId = memberId, enthusiasm = request.enthusiasm),
        )
        return ResponseEntity.noContent().build()
    }

    @DeleteMapping("/{memberId}")
    fun delete(
        @PathVariable eventId: String,
        @PathVariable memberId: String,
    ): ResponseEntity<Unit> {
        deleteMember.execute(memberId)
        return ResponseEntity.noContent().build()
    }
}
