package com.salurec.match.presentation.controller

import com.salurec.generated.api.MatchQueryApi
import com.salurec.generated.model.GoalResponse
import com.salurec.generated.model.MatchDetailResponse
import com.salurec.generated.model.MatchListItemResponse
import com.salurec.generated.model.MatchListResponse
import com.salurec.generated.model.MatchParticipantResponse
import com.salurec.identity.domain.model.AuthPrincipal
import com.salurec.match.application.query.MatchQueryService
import com.salurec.match.domain.exception.MatchNotFoundException
import com.salurec.match.infrastructure.persistence.entity.MatchJpaEntity
import com.salurec.match.infrastructure.persistence.repository.MatchJpaRepository
import com.salurec.member.infrastructure.persistence.repository.MemberJpaRepository
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

/**
 * マッチクエリ(読み込み)Controller。
 * 生成された MatchQueryApi インターフェースを実装する。
 */
@RestController
class MatchQueryController(
    private val matchQueryService: MatchQueryService,
    private val matchJpaRepository: MatchJpaRepository,
    private val memberJpaRepository: MemberJpaRepository,
) : MatchQueryApi {

    override fun listMatches(
        eventId: String,
        roundId: String,
    ): ResponseEntity<MatchListResponse> {
        requireEventAccess(eventId)

        val items = matchQueryService.listByRoundId(roundId).map { dto ->
            MatchListItemResponse(
                id = dto.id,
                matchNumber = dto.matchNumber,
                teamAName = dto.teamAName,
                teamBName = dto.teamBName,
                status = MatchListItemResponse.Status.valueOf(dto.status),
                scoreA = dto.scoreA,
                scoreB = dto.scoreB,
            )
        }
        return ResponseEntity.ok(MatchListResponse(matches = items))
    }

    override fun getMatchDetail(
        eventId: String,
        roundId: String,
        matchId: String,
    ): ResponseEntity<MatchDetailResponse> {
        requireEventAccess(eventId)

        val entity = matchJpaRepository.findById(UUID.fromString(matchId)).orElse(null)
            ?: throw MatchNotFoundException(matchId)

        // メンバー名を取得するためのマップを構築
        val memberIds = entity.participants.map { it.id.memberId } +
            entity.goals.mapNotNull { it.scorerMemberId }
        val memberNameMap = if (memberIds.isNotEmpty()) {
            memberJpaRepository.findAllById(memberIds.distinct())
                .associate { it.id to it.name }
        } else {
            emptyMap()
        }

        val participants = entity.participants.map { p ->
            MatchParticipantResponse(
                memberId = p.id.memberId.toString(),
                memberName = memberNameMap[p.id.memberId] ?: "",
                team = MatchParticipantResponse.Team.valueOf(p.team),
                isSubstitute = p.isSubstitute,
            )
        }

        val goals = entity.goals.map { g ->
            GoalResponse(
                id = g.id.toString(),
                team = GoalResponse.Team.valueOf(g.team),
                scorerMemberId = g.scorerMemberId?.toString(),
                scorerName = g.scorerMemberId?.let { memberNameMap[it] },
                type = GoalResponse.Type.valueOf(g.type),
            )
        }

        val scoreA = entity.goals.count { it.team == "A" }
        val scoreB = entity.goals.count { it.team == "B" }

        val body = MatchDetailResponse(
            id = entity.id.toString(),
            roundId = entity.roundId.toString(),
            matchNumber = entity.matchNumber,
            teamAName = entity.teamAName,
            teamBName = entity.teamBName,
            status = MatchDetailResponse.Status.valueOf(entity.status),
            scoreA = scoreA,
            scoreB = scoreB,
            participants = participants,
            goals = goals,
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
