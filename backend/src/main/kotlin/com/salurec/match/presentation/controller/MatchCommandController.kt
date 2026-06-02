package com.salurec.match.presentation.controller

import com.salurec.generated.api.MatchCommandApi
import com.salurec.generated.model.AddSubstituteRequest
import com.salurec.generated.model.CreateMatchRequest
import com.salurec.generated.model.CreateMatchResponse
import com.salurec.generated.model.RecordGoalRequest
import com.salurec.generated.model.RecordGoalResponse
import com.salurec.identity.domain.model.AuthPrincipal
import com.salurec.match.application.command.AddSubstituteUseCase
import com.salurec.match.application.command.CreateMatchUseCase
import com.salurec.match.application.command.FinishMatchUseCase
import com.salurec.match.application.command.RecordGoalUseCase
import com.salurec.match.application.command.RemoveGoalUseCase
import com.salurec.match.application.command.ReopenMatchUseCase
import com.salurec.match.application.dto.AddSubstituteCommand
import com.salurec.match.application.dto.CreateMatchCommand
import com.salurec.match.application.dto.RecordGoalCommand
import com.salurec.match.domain.model.GoalType
import com.salurec.match.domain.model.MatchTeam
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

/**
 * マッチコマンド(書き込み)Controller。
 * 生成された MatchCommandApi インターフェースを実装する。
 */
@RestController
class MatchCommandController(
    private val createMatchUseCase: CreateMatchUseCase,
    private val recordGoalUseCase: RecordGoalUseCase,
    private val removeGoalUseCase: RemoveGoalUseCase,
    private val addSubstituteUseCase: AddSubstituteUseCase,
    private val finishMatchUseCase: FinishMatchUseCase,
    private val reopenMatchUseCase: ReopenMatchUseCase,
) : MatchCommandApi {

    override fun createMatch(
        eventId: String,
        roundId: String,
        createMatchRequest: CreateMatchRequest,
    ): ResponseEntity<CreateMatchResponse> {
        requireEventAccess(eventId)

        val participants = createMatchRequest.participants.map { input ->
            CreateMatchCommand.ParticipantInput(
                memberId = input.memberId,
                team = MatchTeam.valueOf(input.team.value),
            )
        }
        val command = CreateMatchCommand(
            roundId = roundId,
            teamAName = createMatchRequest.teamAName,
            teamBName = createMatchRequest.teamBName,
            participants = participants,
        )
        val result = createMatchUseCase.execute(command)

        val body = CreateMatchResponse(
            matchId = result.matchId.value,
            matchNumber = 0, // 実際の matchNumber は save 時に決定される
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(body)
    }

    override fun recordGoal(
        eventId: String,
        roundId: String,
        matchId: String,
        recordGoalRequest: RecordGoalRequest,
    ): ResponseEntity<RecordGoalResponse> {
        requireEventAccess(eventId)

        val command = RecordGoalCommand(
            matchId = matchId,
            team = MatchTeam.valueOf(recordGoalRequest.team.value),
            scorerId = recordGoalRequest.scorerMemberId,
            type = GoalType.valueOf(recordGoalRequest.type.value),
        )
        val goalId = recordGoalUseCase.execute(command)

        return ResponseEntity.status(HttpStatus.CREATED).body(RecordGoalResponse(goalId = goalId))
    }

    override fun removeGoal(
        eventId: String,
        roundId: String,
        matchId: String,
        goalId: String,
    ): ResponseEntity<Unit> {
        requireEventAccess(eventId)
        removeGoalUseCase.execute(matchId, goalId)
        return ResponseEntity.noContent().build()
    }

    override fun addSubstitute(
        eventId: String,
        roundId: String,
        matchId: String,
        addSubstituteRequest: AddSubstituteRequest,
    ): ResponseEntity<Unit> {
        requireEventAccess(eventId)

        val command = AddSubstituteCommand(
            matchId = matchId,
            memberId = addSubstituteRequest.memberId,
            team = MatchTeam.valueOf(addSubstituteRequest.team.value),
        )
        addSubstituteUseCase.execute(command)
        return ResponseEntity.noContent().build()
    }

    override fun finishMatch(
        eventId: String,
        roundId: String,
        matchId: String,
    ): ResponseEntity<Unit> {
        requireEventAccess(eventId)
        finishMatchUseCase.execute(matchId)
        return ResponseEntity.noContent().build()
    }

    override fun reopenMatch(
        eventId: String,
        roundId: String,
        matchId: String,
    ): ResponseEntity<Unit> {
        requireEventAccess(eventId)
        reopenMatchUseCase.execute(matchId)
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
