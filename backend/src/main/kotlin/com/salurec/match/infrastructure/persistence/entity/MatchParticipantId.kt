package com.salurec.match.infrastructure.persistence.entity

import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import java.io.Serializable
import java.util.UUID

/**
 * match_participants テーブルの複合主キー。
 */
@Embeddable
class MatchParticipantId(
    @Column(name = "match_id")
    var matchId: UUID = UUID.randomUUID(),

    @Column(name = "member_id")
    var memberId: UUID = UUID.randomUUID(),
) : Serializable {

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is MatchParticipantId) return false
        return matchId == other.matchId && memberId == other.memberId
    }

    override fun hashCode(): Int = 31 * matchId.hashCode() + memberId.hashCode()

    companion object {
        private const val serialVersionUID = 1L
    }
}
