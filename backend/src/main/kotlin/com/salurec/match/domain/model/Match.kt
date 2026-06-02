package com.salurec.match.domain.model

import com.salurec.member.domain.model.MemberId

/**
 * Match 集約ルート。
 *
 * ラウンド内の個別試合を表す。得点記録、助っ人追加、試合終了・再開を制御する。
 * Round への参照は RoundId のみ保持する（独立集約）。
 */
data class Match(
    val id: MatchId,
    val roundId: RoundId,
    val matchNumber: Int,
    val teamAName: TeamName,
    val teamBName: TeamName,
    val status: MatchStatus,
    val participants: List<MatchParticipant>,
    val goals: List<Goal>,
) {
    init {
        // participants の memberId 重複不可
        val memberIds = participants.map { it.memberId }
        require(memberIds.distinct().size == memberIds.size) { "参加者のメンバーIDが重複しています" }
    }

    /**
     * ゴールを記録する。
     */
    fun recordGoal(goal: Goal): Match {
        check(status == MatchStatus.InProgress) { "進行中の試合のみ得点記録できます" }
        return copy(goals = goals + goal)
    }

    /**
     * ゴールを削除する。
     */
    fun removeGoal(goalId: GoalId): Match {
        check(status == MatchStatus.InProgress) { "進行中の試合のみ編集できます" }
        return copy(goals = goals.filterNot { it.id == goalId })
    }

    /**
     * 助っ人を追加する。
     */
    fun addSubstitute(memberId: MemberId, team: MatchTeam): Match {
        check(status == MatchStatus.InProgress) { "進行中の試合のみ助っ人を追加できます" }
        require(participants.none { it.memberId == memberId }) { "既に出場しているメンバーです" }
        return copy(participants = participants + MatchParticipant(memberId, team, isSubstitute = true))
    }

    /**
     * 試合を終了する。最終的なゴールリストと追加助っ人を確定する。
     */
    fun finish(goals: List<Goal>, newSubs: List<MatchParticipant>): Match {
        check(status == MatchStatus.InProgress) { "進行中の試合のみ終了できます" }
        return copy(
            status = MatchStatus.Finished,
            goals = goals,
            participants = participants + newSubs,
        )
    }

    /**
     * 試合を再開する。
     */
    fun reopen(): Match {
        check(status == MatchStatus.Finished) { "終了状態の試合のみ再開できます" }
        return copy(status = MatchStatus.InProgress)
    }

    /**
     * チームAの得点数を返す。
     */
    fun scoreA(): Int = goals.count { it.team == MatchTeam.A }

    /**
     * チームBの得点数を返す。
     */
    fun scoreB(): Int = goals.count { it.team == MatchTeam.B }

    companion object {
        /**
         * 新規試合を生成する。
         */
        fun create(
            id: MatchId,
            roundId: RoundId,
            matchNumber: Int,
            teamAName: TeamName,
            teamBName: TeamName,
            participants: List<MatchParticipant>,
        ): Match = Match(
            id = id,
            roundId = roundId,
            matchNumber = matchNumber,
            teamAName = teamAName,
            teamBName = teamBName,
            status = MatchStatus.InProgress,
            participants = participants,
            goals = emptyList(),
        )
    }
}
