package com.salurec.match.infrastructure.persistence.repository

import com.salurec.match.infrastructure.persistence.entity.RoundJpaEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

/**
 * Round の Spring Data JPA リポジトリ。
 */
interface RoundJpaRepository : JpaRepository<RoundJpaEntity, UUID> {
    fun countByEventId(eventId: UUID): Int
    fun findByEventIdOrderByRoundNumberAsc(eventId: UUID): List<RoundJpaEntity>
}
