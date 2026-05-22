package com.salurec.member.presentation.controller

import com.salurec.generated.api.MemberCommandApi
import com.salurec.generated.model.BulkRegisterMembersRequest
import com.salurec.generated.model.BulkRegisterMembersResponse
import com.salurec.generated.model.UpdateEnthusiasmRequest
import com.salurec.generated.model.UpdateMemberRequest
import com.salurec.member.application.dto.BulkRegisterMembersCommand
import com.salurec.member.application.dto.RegisterMemberInput
import com.salurec.member.application.dto.UpdateEnthusiasmCommand
import com.salurec.member.application.dto.UpdateMemberCommand
import com.salurec.member.application.command.BulkRegisterMembersUseCase
import com.salurec.member.application.command.DeleteMemberUseCase
import com.salurec.member.application.command.UpdateEnthusiasmUseCase
import com.salurec.member.application.command.UpdateMemberUseCase
import com.salurec.member.domain.model.SoccerExperience
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

/**
 * メンバーコマンド Controller。
 * 生成された MemberCommandApi インターフェースを実装する。
 */
@RestController
class MemberCommandController(
    private val bulkRegister: BulkRegisterMembersUseCase,
    private val updateMember: UpdateMemberUseCase,
    private val updateEnthusiasm: UpdateEnthusiasmUseCase,
    private val deleteMember: DeleteMemberUseCase,
) : MemberCommandApi {

    override fun registerMembers(
        eventId: String,
        bulkRegisterMembersRequest: BulkRegisterMembersRequest,
    ): ResponseEntity<BulkRegisterMembersResponse> {
        val command = BulkRegisterMembersCommand(
            eventId = eventId,
            members = bulkRegisterMembersRequest.members.map {
                RegisterMemberInput(
                    name = it.name,
                    seniorityYear = it.seniorityYear,
                    soccerExperience = SoccerExperience.valueOf(it.soccerExperience.name),
                    isOrganizer = it.isOrganizer ?: false,
                    note = it.note ?: "",
                )
            },
        )
        val ids = bulkRegister.execute(command)
        return ResponseEntity.status(HttpStatus.CREATED).body(BulkRegisterMembersResponse(ids))
    }

    override fun updateMember(
        eventId: String,
        memberId: String,
        updateMemberRequest: UpdateMemberRequest,
    ): ResponseEntity<Unit> {
        updateMember.execute(
            UpdateMemberCommand(
                memberId = memberId,
                name = updateMemberRequest.name,
                seniorityYear = updateMemberRequest.seniorityYear,
                soccerExperience = SoccerExperience.valueOf(updateMemberRequest.soccerExperience.name),
                isOrganizer = updateMemberRequest.isOrganizer ?: false,
                note = updateMemberRequest.note ?: "",
                enthusiasm = updateMemberRequest.enthusiasm,
            ),
        )
        return ResponseEntity.noContent().build()
    }

    override fun updateEnthusiasm(
        eventId: String,
        memberId: String,
        updateEnthusiasmRequest: UpdateEnthusiasmRequest,
    ): ResponseEntity<Unit> {
        updateEnthusiasm.execute(
            UpdateEnthusiasmCommand(memberId = memberId, enthusiasm = updateEnthusiasmRequest.enthusiasm),
        )
        return ResponseEntity.noContent().build()
    }

    override fun deleteMember(eventId: String, memberId: String): ResponseEntity<Unit> {
        deleteMember.execute(memberId)
        return ResponseEntity.noContent().build()
    }
}
