package com.salurec.event.infrastructure.persistence.repository

import com.salurec.event.domain.model.Event
import com.salurec.event.domain.model.EventId
import com.salurec.event.domain.model.JoinCode
import com.salurec.event.domain.repository.EventRepository
import com.salurec.event.infrastructure.persistence.mapper.EventEntityMapper
import org.springframework.stereotype.Repository
import java.util.UUID

/**
 * EventRepository の実装。JPA Entity とのマッピングを担う。
 */
@Repository
class EventRepositoryImpl(
    private val jpaRepository: EventJpaRepository,
) : EventRepository {

    override fun save(event: Event): Event {
        val uuid = UUID.fromString(event.id.value)
        val existing = jpaRepository.findById(uuid).orElse(null)
        val entity = if (existing != null) {
            EventEntityMapper.applyDomain(existing, event)
            existing
        } else {
            EventEntityMapper.toEntity(event)
        }
        val saved = jpaRepository.save(entity)
        return EventEntityMapper.toDomain(saved)
    }

    override fun findById(id: EventId): Event? =
        jpaRepository.findById(UUID.fromString(id.value))
            .map(EventEntityMapper::toDomain)
            .orElse(null)

    override fun findByJoinCode(code: JoinCode): Event? =
        jpaRepository.findByJoinCode(code.value)?.let(EventEntityMapper::toDomain)

    override fun existsByJoinCode(code: JoinCode): Boolean =
        jpaRepository.existsByJoinCode(code.value)

    override fun delete(id: EventId) {
        jpaRepository.deleteById(UUID.fromString(id.value))
    }
}
