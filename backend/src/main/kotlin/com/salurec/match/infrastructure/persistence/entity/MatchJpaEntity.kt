package com.salurec.match.infrastructure.persistence.entity

import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.OneToMany
import jakarta.persistence.OrderBy
import jakarta.persistence.PreUpdate
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/**
 * matches テーブル JPA Entity。永続化専用。
 */
@Entity
@Table(name = "matches")
class MatchJpaEntity(
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID,

    @Column(name = "round_id", nullable = false)
    var roundId: UUID,

    @Column(name = "match_number", nullable = false)
    var matchNumber: Int,

    @Column(name = "team_a_name", nullable = false)
    var teamAName: String,

    @Column(name = "team_b_name", nullable = false)
    var teamBName: String,

    @Column(name = "status", nullable = false)
    var status: String,

    @OneToMany(
        mappedBy = "match",
        cascade = [CascadeType.ALL],
        orphanRemoval = true,
        fetch = FetchType.LAZY,
    )
    var participants: MutableList<MatchParticipantJpaEntity> = mutableListOf(),

    @OneToMany(
        mappedBy = "match",
        cascade = [CascadeType.ALL],
        orphanRemoval = true,
        fetch = FetchType.LAZY,
    )
    @OrderBy("createdAt ASC")
    var goals: MutableList<GoalJpaEntity> = mutableListOf(),

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
