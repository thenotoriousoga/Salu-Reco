package com.salurec.event.infrastructure.persistence.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/**
 * events テーブル JPA Entity。
 * ドメインロジックは持たず永続化専用。ID は UUID v7 を文字列化した UUID 型で保持する。
 */
@Entity
@Table(name = "events")
class EventJpaEntity(
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID,

    @Column(name = "name", nullable = false)
    var name: String,

    @Column(name = "event_date", nullable = false)
    var eventDate: LocalDate,

    @Column(name = "status", nullable = false)
    var status: String,

    @Column(name = "join_code", nullable = false, unique = true, length = 5)
    var joinCode: String,

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
