package com.salurec.match.infrastructure.persistence.query

import com.salurec.match.application.query.RoundQueryService
import com.salurec.match.application.query.dto.RoundDto
import com.salurec.match.application.query.dto.RoundListItemDto
import com.salurec.match.infrastructure.persistence.entity.RoundJpaEntity
import com.salurec.match.infrastructure.persistence.mapper.RoundEntityMapper
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * ラウンドの Read 側クエリサービス実装。
 * JPQL で直接 DTO に射影する。
 */
@Service
@Transactional(readOnly = true)
class RoundQueryServiceImpl(
    private val em: EntityManager,
) : RoundQueryService {

    override fun listByEventId(eventId: String): List<RoundListItemDto> {
        val uuid = UUID.fromString(eventId)
        val jpql = """
            SELECT r
            FROM RoundJpaEntity r
            WHERE r.eventId = :eventId
            ORDER BY r.roundNumber ASC
        """.trimIndent()

        val entities = em.createQuery(jpql, RoundJpaEntity::class.java)
            .setParameter("eventId", uuid)
            .resultList

        return entities.map { entity ->
            // teamAssignment の JSON からチーム数を取得
            val round = RoundEntityMapper.toDomain(entity)
            RoundListItemDto(
                id = entity.id.toString(),
                roundNumber = entity.roundNumber,
                status = entity.status,
                teamCount = round.teamAssignment.teams.size,
            )
        }
    }

    override fun hasOngoingRoundIn(eventId: String): Boolean {
        val uuid = UUID.fromString(eventId)
        val jpql = """
            SELECT COUNT(r) FROM RoundJpaEntity r
            WHERE r.eventId = :eventId AND r.status = :status
        """.trimIndent()

        val count = em.createQuery(jpql, Long::class.java)
            .setParameter("eventId", uuid)
            .setParameter("status", "InProgress")
            .singleResult

        return count > 0
    }
}
