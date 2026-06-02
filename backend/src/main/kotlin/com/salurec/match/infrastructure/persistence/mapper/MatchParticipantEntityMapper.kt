package com.salurec.match.infrastructure.persistence.mapper

import com.salurec.match.domain.model.MatchParticipant
import com.salurec.match.domain.model.MatchTeam
import com.salurec.match.infrastructure.persistence.entity.MatchJpaEntity
import com.salurec.match.infrastructure.persistence.entity.MatchParticipantId
import com.salurec.match.infrastructure.persistence.entity.MatchParticipantJpaEntity
import com.salurec.member.domain.model.MemberId
import java.util.UUID

/**
 * MatchParticipant ドメインモデル ⇄ MatchParticipantJpaEntity の変換。
 */
object MatchParticipantEntityMapper {

    fun toDomain(entity: MatchParticipantJpaEntity): MatchParticipant = MatchParticipant(
        memberId = MemberId(entity.id.memberId.toString()),
        team = MatchTeam.valueOf(entity.team),
        isSubstitute = entity.isSubstitute,
    )

    fun toEntity(domain: MatchParticipant, match: MatchJpaEntity): MatchParticipantJpaEntity =
        MatchParticipantJpaEntity(
            id = MatchParticipantId(
                matchId = match.id,
                memberId = UUID.fromString(domain.memberId.value),
            ),
            match = match,
            team = domain.team.name,
            isSubstitute = domain.isSubstitute,
        )
}
