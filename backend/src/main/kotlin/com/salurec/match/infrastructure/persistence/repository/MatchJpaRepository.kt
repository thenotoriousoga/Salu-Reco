package com.salurec.match.infrastructure.persistence.repository

import com.salurec.match.infrastructure.persistence.entity.MatchJpaEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

/**
 * Match の Spring Data JPA リポジトリ。
 */
interface MatchJpaRepository : JpaRepository<MatchJpaEntity, UUID> {
    fun findByRoundIdOrderByMatchNumberAsc(roundId: UUID): List<MatchJpaEntity>
    fun countByRoundId(roundId: UUID): Int
    fun existsByRoundIdAndStatus(roundId: UUID, status: String): Boolean
}
