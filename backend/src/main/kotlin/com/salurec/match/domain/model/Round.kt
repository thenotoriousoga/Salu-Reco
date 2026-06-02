package com.salurec.match.domain.model

import com.salurec.event.domain.model.EventId

/**
 * Round 集約ルート。
 *
 * イベント内のラウンド（試合セット）を表す。
 * チーム分け結果を保持し、配下の Match の進行状況に基づいて終了・再開を制御する。
 */
data class Round(
    val id: RoundId,
    val eventId: EventId,
    val roundNumber: Int,
    val status: RoundStatus,
    val teamAssignment: TeamAssignment,
) {
    /**
     * ラウンドを終了する。
     * @param hasOngoingMatch 配下に進行中の試合があるか（UseCase が MatchQueryService から取得して渡す）
     */
    fun finish(hasOngoingMatch: Boolean): Round {
        check(status == RoundStatus.InProgress) { "進行中のラウンドのみ終了できます" }
        require(!hasOngoingMatch) { "進行中の試合があります。先に試合を終了してください" }
        return copy(status = RoundStatus.Finished)
    }

    /**
     * ラウンドを再開する。
     */
    fun reopen(): Round {
        check(status == RoundStatus.Finished) { "終了状態のラウンドのみ再開できます" }
        return copy(status = RoundStatus.InProgress)
    }

    companion object {
        /**
         * 新規ラウンドを生成する。
         */
        fun create(
            id: RoundId,
            eventId: EventId,
            roundNumber: Int,
            teamAssignment: TeamAssignment,
        ): Round = Round(
            id = id,
            eventId = eventId,
            roundNumber = roundNumber,
            status = RoundStatus.InProgress,
            teamAssignment = teamAssignment,
        )
    }
}
