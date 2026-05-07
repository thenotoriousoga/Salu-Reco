package com.salurec.event.infrastructure.persistence.query

import com.salurec.event.application.query.dto.EventDetailDto
import com.salurec.event.application.query.dto.EventListItemDto
import com.salurec.event.application.query.service.EventQueryService
import com.salurec.event.infrastructure.persistence.entity.EventJpaEntity
import jakarta.persistence.EntityManager
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * Event の Read 側クエリサービス実装。
 * Phase 1 時点では Event テーブル単体から射影する。
 * クロスコンテキストの COUNT/EXISTS は Phase 4 以降で追加する。
 */
@Service
@Transactional(readOnly = true)
class EventQueryServiceImpl(
    private val em: EntityManager,
) : EventQueryService {

    override fun list(): List<EventListItemDto> {
        val jpql = """
            SELECT e
            FROM EventJpaEntity e
            ORDER BY e.eventDate DESC, e.createdAt DESC
        """.trimIndent()

        return em.createQuery(jpql, EventJpaEntity::class.java)
            .resultList
            .map { it.toListItem() }
    }

    override fun findDetail(id: String): EventDetailDto? {
        val uuid = try {
            UUID.fromString(id)
        } catch (_: IllegalArgumentException) {
            return null
        }
        val entity = em.find(EventJpaEntity::class.java, uuid) ?: return null
        return EventDetailDto(
            id = entity.id.toString(),
            name = entity.name,
            date = entity.eventDate,
            status = entity.status,
            joinCode = entity.joinCode,
        )
    }

    private fun EventJpaEntity.toListItem(): EventListItemDto = EventListItemDto(
        id = id.toString(),
        name = name,
        date = eventDate,
        status = status,
        joinCode = joinCode,
    )
}
