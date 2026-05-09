package com.salurec.member.infrastructure.persistence.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/**
 * members テーブル JPA Entity。永続化専用。
 */
@Entity
@Table(name = "members")
class MemberJpaEntity(
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID,

    @Column(name = "event_id", nullable = false)
    var eventId: UUID,

    @Column(name = "name", nullable = false)
    var name: String,

    @Column(name = "seniority_year", nullable = false)
    var seniorityYear: Int,

    @Column(name = "soccer_experience", nullable = false)
    var soccerExperience: String,

    @Column(name = "is_organizer", nullable = false)
    var isOrganizer: Boolean = false,

    @Column(name = "note", nullable = false)
    var note: String = "",

    @Column(name = "enthusiasm", nullable = false)
    var enthusiasm: String = "",

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
