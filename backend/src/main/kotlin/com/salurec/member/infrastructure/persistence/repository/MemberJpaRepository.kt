package com.salurec.member.infrastructure.persistence.repository

import com.salurec.member.infrastructure.persistence.entity.MemberJpaEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface MemberJpaRepository : JpaRepository<MemberJpaEntity, UUID> {
    fun findByEventIdOrderByCreatedAtAsc(eventId: UUID): List<MemberJpaEntity>
    fun countByEventId(eventId: UUID): Int
}
