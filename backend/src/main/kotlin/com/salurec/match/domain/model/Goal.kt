package com.salurec.match.domain.model

import com.salurec.member.domain.model.MemberId

/**
 * ゴールの値オブジェクト（IDを持つ値オブジェクト）。
 * UIでの削除・編集で必要なため ID を保持する。
 */
data class Goal(
    val id: GoalId,
    val team: MatchTeam,
    val scorerId: MemberId?,
    val type: GoalType,
) {
    init {
        when (type) {
            GoalType.Normal -> require(scorerId != null) { "通常ゴールには得点者が必須です" }
            GoalType.OwnGoal, GoalType.Unknown -> require(scorerId == null) {
                "オウンゴール・不明ゴールの得点者は null にしてください"
            }
        }
    }
}
