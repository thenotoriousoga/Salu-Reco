package com.salurec.match.infrastructure.persistence.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.util.UUID

/**
 * rounds テーブル JPA Entity。永続化専用。
 */
@Entity
@Table(name = "rounds")
class RoundJpaEntity(
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID,

    @Column(name = "event_id", nullable = false)
    var eventId: UUID,

    @Column(name = "round_number", nullable = false)
    var roundNumber: Int,

    @Column(name = "status", nullable = false)
    var status: String,

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "team_assignment", columnDefinition = "jsonb", nullable = false)
    var teamAssignment: String,

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),
) {
    @PreUpdate
    fun onUpdate() {
        updatedAt = Instant.now()
    }
}
