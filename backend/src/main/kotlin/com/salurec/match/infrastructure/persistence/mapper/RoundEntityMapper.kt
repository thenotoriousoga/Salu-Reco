package com.salurec.match.infrastructure.persistence.mapper

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.salurec.event.domain.model.EventId
import com.salurec.match.domain.model.Round
import com.salurec.match.domain.model.RoundId
import com.salurec.match.domain.model.RoundStatus
import com.salurec.match.domain.model.Team
import com.salurec.match.domain.model.TeamAssignment
import com.salurec.match.domain.model.TeamName
import com.salurec.match.infrastructure.persistence.entity.RoundJpaEntity
import com.salurec.member.domain.model.MemberId
import java.util.UUID

/**
 * Round ドメインモデル ⇄ RoundJpaEntity の変換。
 * teamAssignment は JSONB カラムに JSON 文字列として保持する。
 */
object RoundEntityMapper {

    private val objectMapper = jacksonObjectMapper()

    fun toDomain(entity: RoundJpaEntity): Round {
        val teamAssignment = deserializeTeamAssignment(entity.teamAssignment)
        return Round(
            id = RoundId(entity.id.toString()),
            eventId = EventId(entity.eventId.toString()),
            roundNumber = entity.roundNumber,
            status = RoundStatus.valueOf(entity.status),
            teamAssignment = teamAssignment,
        )
    }

    fun toEntity(domain: Round): RoundJpaEntity = RoundJpaEntity(
        id = UUID.fromString(domain.id.value),
        eventId = UUID.fromString(domain.eventId.value),
        roundNumber = domain.roundNumber,
        status = domain.status.name,
        teamAssignment = serializeTeamAssignment(domain.teamAssignment),
    )

    /** 既存 Entity にドメインの状態を反映する（更新用） */
    fun applyDomain(entity: RoundJpaEntity, domain: Round) {
        entity.status = domain.status.name
        entity.teamAssignment = serializeTeamAssignment(domain.teamAssignment)
    }

    /**
     * TeamAssignment を JSON 文字列にシリアライズする。
     * JSON 構造: { "names": [...], "teams": [[...], [...]], "captains": [...] }
     */
    private fun serializeTeamAssignment(teamAssignment: TeamAssignment): String {
        val json = TeamAssignmentJson(
            names = teamAssignment.teams.map { it.name.value },
            teams = teamAssignment.teams.map { team -> team.memberIds.map { it.value } },
            captains = teamAssignment.teams.map { it.captainId?.value },
        )
        return objectMapper.writeValueAsString(json)
    }

    /**
     * JSON 文字列を TeamAssignment にデシリアライズする。
     */
    private fun deserializeTeamAssignment(json: String): TeamAssignment {
        val parsed: TeamAssignmentJson = objectMapper.readValue(json)
        val teams = parsed.names.mapIndexed { index, name ->
            Team(
                name = TeamName(name),
                memberIds = parsed.teams[index].map { MemberId(it) },
                captainId = parsed.captains.getOrNull(index)?.let { MemberId(it) },
            )
        }
        return TeamAssignment(teams = teams)
    }

    /**
     * JSONB に保存する中間データ構造。
     */
    private data class TeamAssignmentJson(
        val names: List<String>,
        val teams: List<List<String>>,
        val captains: List<String?>,
    )
}
