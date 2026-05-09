package com.salurec.member.infrastructure.persistence.mapper

import com.salurec.event.domain.model.EventId
import com.salurec.member.domain.model.Member
import com.salurec.member.domain.model.MemberId
import com.salurec.member.domain.model.MemberName
import com.salurec.member.domain.model.SoccerExperience
import com.salurec.member.infrastructure.persistence.entity.MemberJpaEntity
import java.util.UUID

object MemberEntityMapper {
    fun toDomain(entity: MemberJpaEntity): Member = Member(
        id = MemberId(entity.id.toString()),
        eventId = EventId(entity.eventId.toString()),
        name = MemberName(entity.name),
        seniorityYear = entity.seniorityYear,
        soccerExperience = SoccerExperience.valueOf(entity.soccerExperience),
        isOrganizer = entity.isOrganizer,
        note = entity.note,
        enthusiasm = entity.enthusiasm,
    )

    fun toEntity(domain: Member): MemberJpaEntity = MemberJpaEntity(
        id = UUID.fromString(domain.id.value),
        eventId = UUID.fromString(domain.eventId.value),
        name = domain.name.value,
        seniorityYear = domain.seniorityYear,
        soccerExperience = domain.soccerExperience.name,
        isOrganizer = domain.isOrganizer,
        note = domain.note,
        enthusiasm = domain.enthusiasm,
    )

    /** 既存 Entity にドメインの状態を反映(更新用)。id / eventId は不変 */
    fun applyDomain(entity: MemberJpaEntity, domain: Member) {
        entity.name = domain.name.value
        entity.seniorityYear = domain.seniorityYear
        entity.soccerExperience = domain.soccerExperience.name
        entity.isOrganizer = domain.isOrganizer
        entity.note = domain.note
        entity.enthusiasm = domain.enthusiasm
    }
}
