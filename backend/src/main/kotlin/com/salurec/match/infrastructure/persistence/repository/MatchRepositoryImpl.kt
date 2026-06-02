package com.salurec.match.infrastructure.persistence.repository

import com.salurec.match.domain.model.Match
import com.salurec.match.domain.model.MatchId
import com.salurec.match.domain.port.MatchRepository
import com.salurec.match.infrastructure.persistence.mapper.MatchEntityMapper
import org.springframework.stereotype.Repository
import java.util.UUID

/**
 * MatchRepository の実装。JPA Entity とのマッピングを担う。
 */
@Repository
class MatchRepositoryImpl(
    private val jpaRepository: MatchJpaRepository,
) : MatchRepository {

    override fun save(match: Match): Match {
        val uuid = UUID.fromString(match.id.value)
        val existing = jpaRepository.findById(uuid).orElse(null)
        val entity = if (existing != null) {
            MatchEntityMapper.applyDomain(existing, match)
            existing
        } else {
            // 新規作成時: matchNumber をラウンド内連番で設定
            val entity = MatchEntityMapper.toEntity(match)
            if (match.matchNumber == 1) {
                // UseCase が仮設定した matchNumber を実際の連番に置き換え
                val count = jpaRepository.countByRoundId(entity.roundId)
                entity.matchNumber = count + 1
            }
            entity
        }
        val saved = jpaRepository.save(entity)
        return MatchEntityMapper.toDomain(saved)
    }

    override fun findById(id: MatchId): Match? =
        jpaRepository.findById(UUID.fromString(id.value))
            .map(MatchEntityMapper::toDomain)
            .orElse(null)

    override fun existsOngoingByRoundId(roundId: String): Boolean =
        jpaRepository.existsByRoundIdAndStatus(UUID.fromString(roundId), "InProgress")
}
