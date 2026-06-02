package com.salurec.match.presentation.controller

import com.salurec.generated.api.RoundQueryApi
import com.salurec.generated.model.RoundDetailResponse
import com.salurec.generated.model.RoundListItemResponse
import com.salurec.generated.model.RoundListResponse
import com.salurec.generated.model.TeamAssignment
import com.salurec.generated.model.TeamResponse
import com.salurec.identity.domain.model.AuthPrincipal
import com.salurec.match.application.query.MatchQueryService
import com.salurec.match.application.query.RoundQueryService
import com.salurec.match.domain.exception.RoundNotFoundException
import com.salurec.match.domain.model.RoundId
import com.salurec.match.domain.port.RoundRepository
import com.salurec.match.infrastructure.persistence.mapper.RoundEntityMapper
import com.salurec.match.infrastructure.persistence.repository.MatchJpaRepository
import com.salurec.match.infrastructure.persistence.repository.RoundJpaRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

/**
 * ラウンドクエリ(読み込み)Controller。
 * 生成された RoundQueryApi インターフェースを実装する。
 */
@RestController
class RoundQueryController(
    private val roundQueryService: RoundQueryService,
    private val matchQueryService: MatchQueryService,
    private val roundJpaRepository: RoundJpaRepository,
    private val matchJpaRepository: MatchJpaRepository,
) : RoundQueryApi {

    override fun listRounds(
        eventId: String,
    ): ResponseEntity<RoundListResponse> {
        requireEventAccess(eventId)

        val items = roundQueryService.listByEventId(eventId).map { dto ->
            val matchCount = matchJpaRepository.countByRoundId(UUID.fromString(dto.id))
            RoundListItemResponse(
                id = dto.id,
                roundNumber = dto.roundNumber,
                status = RoundListItemResponse.Status.valueOf(dto.status),
                teamCount = dto.teamCount,
                matchCount = matchCount,
            )
        }
        return ResponseEntity.ok(RoundListResponse(rounds = items))
    }

    override fun getRoundDetail(
        eventId: String,
        roundId: String,
    ): ResponseEntity<RoundDetailResponse> {
        requireEventAccess(eventId)

        val entity = roundJpaRepository.findById(UUID.fromString(roundId)).orElse(null)
            ?: throw RoundNotFoundException(roundId)

        val round = RoundEntityMapper.toDomain(entity)
        val teamAssignment = TeamAssignment(
            teams = round.teamAssignment.teams.map { team ->
                TeamResponse(
                    name = team.name.value,
                    memberIds = team.memberIds.map { it.value },
                    captainId = team.captainId?.value,
                )
            },
        )

        val body = RoundDetailResponse(
            id = round.id.value,
            eventId = round.eventId.value,
            roundNumber = round.roundNumber,
            status = RoundDetailResponse.Status.valueOf(round.status.name),
            teamAssignment = teamAssignment,
        )
        return ResponseEntity.ok(body)
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
