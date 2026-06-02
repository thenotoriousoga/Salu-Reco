package com.salurec.match.domain.model

import com.salurec.member.domain.model.MemberId

/**
 * 試合参加者の値オブジェクト。
 */
data class MatchParticipant(
    val memberId: MemberId,
    val team: MatchTeam,
    val isSubstitute: Boolean,
)
