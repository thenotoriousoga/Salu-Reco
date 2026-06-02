package com.salurec.match.presentation.controller

import com.salurec.generated.api.RoundCommandApi
import com.salurec.generated.model.CreateRoundRequest
import com.salurec.generated.model.CreateRoundResponse
import com.salurec.generated.model.TeamAssignment
import com.salurec.generated.model.TeamResponse
import com.salurec.identity.domain.model.AuthPrincipal
import com.salurec.match.application.command.CreateRoundUseCase
import com.salurec.match.application.command.FinishRoundUseCase
import com.salurec.match.application.command.ReopenRoundUseCase
import com.salurec.match.application.dto.CreateRoundCommand
import com.salurec.match.domain.port.RoundRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

/**
 * ラウンドコマンド(書き込み)Controller。
 * 生成された RoundCommandApi インターフェースを実装する。
 */
@RestController
class RoundCommandController(
    private val createRoundUseCase: CreateRoundUseCase,
    private val finishRoundUseCase: FinishRoundUseCase,
    private val reopenRoundUseCase: ReopenRoundUseCase,
    private val roundRepository: RoundRepository,
) : RoundCommandApi {

    override fun createRound(
        eventId: String,
        createRoundRequest: CreateRoundRequest,
    ): ResponseEntity<CreateRoundResponse> {
        requireEventAccess(eventId)

        val command = CreateRoundCommand(
            eventId = eventId,
            teamCount = createRoundRequest.teamCount,
            memberIds = createRoundRequest.memberIds,
        )
        val result = createRoundUseCase.execute(command)

        // ラウンド詳細を取得してレスポンスに含める
        val round = roundRepository.findById(result.roundId)!!
        val teamAssignment = TeamAssignment(
            teams = round.teamAssignment.teams.map { team ->
                TeamResponse(
                    name = team.name.value,
                    memberIds = team.memberIds.map { it.value },
                    captainId = team.captainId?.value,
                )
            },
        )

        val body = CreateRoundResponse(
            roundId = result.roundId.value,
            roundNumber = round.roundNumber,
            teamAssignment = teamAssignment,
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(body)
    }

    override fun finishRound(
        eventId: String,
        roundId: String,
    ): ResponseEntity<Unit> {
        requireEventAccess(eventId)
        finishRoundUseCase.execute(roundId)
        return ResponseEntity.noContent().build()
    }

    override fun reopenRound(
        eventId: String,
        roundId: String,
    ): ResponseEntity<Unit> {
        requireEventAccess(eventId)
        reopenRoundUseCase.execute(roundId)
        return ResponseEntity.noContent().build()
    }

    private fun requireEventAccess(eventId: String) {
        val principal = getAuthPrincipal()
        if (!principal.canAccessEvent(eventId)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "このイベントへのアクセス権限がありません")
        }
    }

    private fun getAuthPrincipal(): AuthPrincipal {
        val context = SecurityContextHolder.getContext()
        return context.authentication?.principal as? AuthPrincipal
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED)
    }
}
