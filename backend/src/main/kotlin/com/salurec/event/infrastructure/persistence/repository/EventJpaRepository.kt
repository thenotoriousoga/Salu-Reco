package com.salurec.event.infrastructure.persistence.repository

import com.salurec.event.infrastructure.persistence.entity.EventJpaEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface EventJpaRepository : JpaRepository<EventJpaEntity, UUID> {
    fun findByJoinCode(joinCode: String): EventJpaEntity?
    fun existsByJoinCode(joinCode: String): Boolean
}
