package com.salurec.member.infrastructure.persistence.query

import com.salurec.member.application.query.dto.MemberListItemDto
import com.salurec.member.application.query.service.MemberQueryService
import com.salurec.member.infrastructure.persistence.entity.MemberJpaEntity
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class MemberQueryServiceImpl(
    private val em: EntityManager,
) : MemberQueryService {

    override fun listByEvent(eventId: String): List<MemberListItemDto> {
        val uuid = try {
            UUID.fromString(eventId)
        } catch (_: IllegalArgumentException) {
            return emptyList()
        }
        val jpql = """
            SELECT m FROM MemberJpaEntity m
            WHERE m.eventId = :eventId
            ORDER BY m.createdAt ASC
        """.trimIndent()
        return em.createQuery(jpql, MemberJpaEntity::class.java)
            .setParameter("eventId", uuid)
            .resultList
            .map {
                MemberListItemDto(
                    id = it.id.toString(),
                    eventId = it.eventId.toString(),
                    name = it.name,
                    seniorityYear = it.seniorityYear,
                    soccerExperience = it.soccerExperience,
                    isOrganizer = it.isOrganizer,
                    note = it.note,
                    enthusiasm = it.enthusiasm,
                )
            }
    }
}
