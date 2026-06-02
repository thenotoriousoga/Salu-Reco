package com.salurec.match.infrastructure.persistence.mapper

import com.salurec.match.domain.model.Goal
import com.salurec.match.domain.model.GoalId
import com.salurec.match.domain.model.GoalType
import com.salurec.match.domain.model.MatchTeam
import com.salurec.match.infrastructure.persistence.entity.GoalJpaEntity
import com.salurec.match.infrastructure.persistence.entity.MatchJpaEntity
import com.salurec.member.domain.model.MemberId
import java.util.UUID

/**
 * Goal ドメインモデル ⇄ GoalJpaEntity の変換。
 */
object GoalEntityMapper {

    fun toDomain(entity: GoalJpaEntity): Goal = Goal(
        id = GoalId(entity.id.toString()),
        team = MatchTeam.valueOf(entity.team),
        scorerId = entity.scorerMemberId?.let { MemberId(it.toString()) },
        type = GoalType.valueOf(entity.type),
    )

    fun toEntity(domain: Goal, match: MatchJpaEntity): GoalJpaEntity = GoalJpaEntity(
        id = UUID.fromString(domain.id.value),
        match = match,
        team = domain.team.name,
        scorerMemberId = domain.scorerId?.let { UUID.fromString(it.value) },
        type = domain.type.name,
    )
}
