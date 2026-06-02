package com.salurec.match.infrastructure.persistence.entity

import jakarta.persistence.Column
import jakarta.persistence.EmbeddedId
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.ManyToOne
import jakarta.persistence.MapsId
import jakarta.persistence.JoinColumn
import jakarta.persistence.Table

/**
 * match_participants テーブル JPA Entity。永続化専用。
 */
@Entity
@Table(name = "match_participants")
class MatchParticipantJpaEntity(
    @EmbeddedId
    var id: MatchParticipantId = MatchParticipantId(),

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("matchId")
    @JoinColumn(name = "match_id")
    var match: MatchJpaEntity? = null,

    @Column(name = "team", nullable = false)
    var team: String = "",

    @Column(name = "is_substitute", nullable = false)
    var isSubstitute: Boolean = false,
)
