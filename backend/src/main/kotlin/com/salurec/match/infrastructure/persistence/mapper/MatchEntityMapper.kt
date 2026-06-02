package com.salurec.match.infrastructure.persistence.mapper

import com.salurec.match.domain.model.Match
import com.salurec.match.domain.model.MatchId
import com.salurec.match.domain.model.MatchStatus
import com.salurec.match.domain.model.RoundId
import com.salurec.match.domain.model.TeamName
import com.salurec.match.infrastructure.persistence.entity.MatchJpaEntity
import java.util.UUID

/**
 * Match ドメインモデル ⇄ MatchJpaEntity の変換。
 */
object MatchEntityMapper {

    fun toDomain(entity: MatchJpaEntity): Match = Match(
        id = MatchId(entity.id.toString()),
        roundId = RoundId(entity.roundId.toString()),
        matchNumber = entity.matchNumber,
        teamAName = TeamName(entity.teamAName),
        teamBName = TeamName(entity.teamBName),
        status = MatchStatus.valueOf(entity.status),
        participants = entity.participants.map(MatchParticipantEntityMapper::toDomain),
        goals = entity.goals.map(GoalEntityMapper::toDomain),
    )

    fun toEntity(domain: Match): MatchJpaEntity {
        val entity = MatchJpaEntity(
            id = UUID.fromString(domain.id.value),
            roundId = UUID.fromString(domain.roundId.value),
            matchNumber = domain.matchNumber,
            teamAName = domain.teamAName.value,
            teamBName = domain.teamBName.value,
            status = domain.status.name,
        )
        entity.participants = domain.participants.map {
            MatchParticipantEntityMapper.toEntity(it, entity)
        }.toMutableList()
        entity.goals = domain.goals.map {
            GoalEntityMapper.toEntity(it, entity)
        }.toMutableList()
        return entity
    }

    /**
     * 既存 Entity にドメインの状態を反映する（更新用）。
     * 子コレクション（participants, goals）は差分反映パターンを使用する。
     */
    fun applyDomain(entity: MatchJpaEntity, domain: Match) {
        entity.status = domain.status.name
        entity.teamAName = domain.teamAName.value
        entity.teamBName = domain.teamBName.value

        // participants の差分反映
        val incomingMemberIds = domain.participants.map { UUID.fromString(it.memberId.value) }.toSet()
        entity.participants.removeAll { it.id.memberId !in incomingMemberIds }

        val existingMemberIds = entity.participants.map { it.id.memberId }.toSet()
        domain.participants.forEach { domainParticipant ->
            val memberId = UUID.fromString(domainParticipant.memberId.value)
            if (memberId !in existingMemberIds) {
                entity.participants.add(
                    MatchParticipantEntityMapper.toEntity(domainParticipant, entity),
                )
            }
        }

        // goals の差分反映
        val incomingGoalIds = domain.goals.map { UUID.fromString(it.id.value) }.toSet()
        entity.goals.removeAll { it.id !in incomingGoalIds }

        val existingGoalIds = entity.goals.map { it.id }.toSet()
        domain.goals.forEach { domainGoal ->
            val goalId = UUID.fromString(domainGoal.id.value)
            if (goalId !in existingGoalIds) {
                entity.goals.add(GoalEntityMapper.toEntity(domainGoal, entity))
            }
        }
    }
}
