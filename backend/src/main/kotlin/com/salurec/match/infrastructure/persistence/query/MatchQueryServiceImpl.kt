package com.salurec.match.infrastructure.persistence.query

import com.salurec.match.application.query.MatchQueryService
import com.salurec.match.application.query.dto.MatchDto
import com.salurec.match.application.query.dto.MatchListItemDto
import com.salurec.match.infrastructure.persistence.entity.MatchJpaEntity
import com.salurec.match.infrastructure.persistence.repository.MatchJpaRepository
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * 試合の Read 側クエリサービス実装。
 * JPQL で直接 DTO に射影する。
 */
@Service
@Transactional(readOnly = true)
class MatchQueryServiceImpl(
    private val em: EntityManager,
    private val matchJpaRepository: MatchJpaRepository,
) : MatchQueryService {

    override fun listByRoundId(roundId: String): List<MatchListItemDto> {
        val uuid = UUID.fromString(roundId)
        val jpql = """
            SELECT m
            FROM MatchJpaEntity m
            LEFT JOIN FETCH m.goals
            WHERE m.roundId = :roundId
            ORDER BY m.matchNumber ASC
        """.trimIndent()

        val entities = em.createQuery(jpql, MatchJpaEntity::class.java)
            .setParameter("roundId", uuid)
            .resultList

        return entities.map { entity ->
            val scoreA = entity.goals.count { it.team == "A" }
            val scoreB = entity.goals.count { it.team == "B" }
            MatchListItemDto(
                id = entity.id.toString(),
                matchNumber = entity.matchNumber,
                teamAName = entity.teamAName,
                teamBName = entity.teamBName,
                status = entity.status,
                scoreA = scoreA,
                scoreB = scoreB,
            )
        }
    }

    override fun hasOngoingMatchIn(roundId: String): Boolean =
        matchJpaRepository.existsByRoundIdAndStatus(UUID.fromString(roundId), "InProgress")

    override fun countRoundsByEventIds(eventIds: List<String>): Map<String, Int> {
        if (eventIds.isEmpty()) return emptyMap()

        val uuids = eventIds.map { UUID.fromString(it) }
        val jpql = """
            SELECT r.eventId, COUNT(r)
            FROM RoundJpaEntity r
            WHERE r.eventId IN :eventIds
            GROUP BY r.eventId
        """.trimIndent()

        @Suppress("UNCHECKED_CAST")
        val results = em.createQuery(jpql)
            .setParameter("eventIds", uuids)
            .resultList as List<Array<Any>>

        return results.associate { row ->
            val eventId = (row[0] as UUID).toString()
            val count = (row[1] as Long).toInt()
            eventId to count
        }
    }
}
