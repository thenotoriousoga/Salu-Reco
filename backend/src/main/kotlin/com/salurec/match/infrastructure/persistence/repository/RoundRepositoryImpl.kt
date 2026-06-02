package com.salurec.match.infrastructure.persistence.repository

import com.salurec.event.domain.model.EventId
import com.salurec.match.domain.model.Round
import com.salurec.match.domain.model.RoundId
import com.salurec.match.domain.port.RoundRepository
import com.salurec.match.infrastructure.persistence.mapper.RoundEntityMapper
import org.springframework.stereotype.Repository
import java.util.UUID

/**
 * RoundRepository の実装。JPA Entity とのマッピングを担う。
 */
@Repository
class RoundRepositoryImpl(
    private val jpaRepository: RoundJpaRepository,
) : RoundRepository {

    override fun save(round: Round): Round {
        val uuid = UUID.fromString(round.id.value)
        val existing = jpaRepository.findById(uuid).orElse(null)
        val entity = if (existing != null) {
            RoundEntityMapper.applyDomain(existing, round)
            existing
        } else {
            RoundEntityMapper.toEntity(round)
        }
        val saved = jpaRepository.save(entity)
        return RoundEntityMapper.toDomain(saved)
    }

    override fun findById(id: RoundId): Round? =
        jpaRepository.findById(UUID.fromString(id.value))
            .map(RoundEntityMapper::toDomain)
            .orElse(null)

    override fun countByEventId(eventId: EventId): Int =
        jpaRepository.countByEventId(UUID.fromString(eventId.value))
}
