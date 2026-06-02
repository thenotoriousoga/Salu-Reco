package com.salurec.match.domain.model

import com.salurec.member.domain.model.MemberId
import com.salurec.member.domain.model.SoccerExperience

/**
 * チーム分け用の軽量DTO。
 * Member 集約への依存を避けるため、必要最小限の情報のみ保持する。
 * ドメインサービス (TeamSplitService) の入力として使用する。
 */
data class MemberForSplit(
    val memberId: MemberId,
    val soccerExperience: SoccerExperience,
)
