package com.salurec.match.infrastructure.persistence.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/**
 * goals テーブル JPA Entity。永続化専用。
 */
@Entity
@Table(name = "goals")
class GoalJpaEntity(
    @Id
    @Column(name = "id", nullable = false, updatable = false)
    var id: UUID,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    var match: MatchJpaEntity? = null,

    @Column(name = "team", nullable = false)
    var team: String,

    @Column(name = "scorer_member_id")
    var scorerMemberId: UUID? = null,

    @Column(name = "type", nullable = false)
    var type: String,

    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),
)
