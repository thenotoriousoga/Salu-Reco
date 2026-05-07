package com.salurec.event.domain.model

import java.time.LocalDate

/**
 * Event 集約ルート。
 *
 * 準備中・進行中・イベント終了の3状態を持ち、ドメインメソッドで遷移を制御する。
 * 集約境界をまたぐ情報(メンバー数、進行中ラウンドの有無)は UseCase が取得して引数で渡す。
 */
data class Event(
    val id: EventId,
    val name: EventName,
    val date: LocalDate,
    val status: EventStatus,
    val joinCode: JoinCode,
) {
    /**
     * 準備中 → 進行中 へ遷移。
     * @param memberCount 現在登録済みのメンバー数(UseCase が Member コンテキストから取得)
     */
    fun start(memberCount: Int): Event {
        check(status == EventStatus.Preparing) { "準備中のイベントのみ開始できます" }
        require(memberCount >= 2) { "メンバーを2名以上登録してください" }
        return copy(status = EventStatus.InProgress)
    }

    /**
     * 進行中 → イベント終了 へ遷移。
     */
    fun finish(roundCount: Int, hasOngoingRound: Boolean): Event {
        check(status == EventStatus.InProgress) { "進行中のイベントのみ終了できます" }
        require(roundCount > 0) { "ラウンドがありません" }
        require(!hasOngoingRound) { "進行中のラウンドがあります" }
        return copy(status = EventStatus.Finished)
    }

    /**
     * イベント終了 → 進行中 へ戻す。
     */
    fun reopen(): Event {
        check(status == EventStatus.Finished) { "イベント終了状態のイベントのみ再開できます" }
        return copy(status = EventStatus.InProgress)
    }

    companion object {
        /**
         * 新規イベントを生成(初期ステータスは準備中)。
         */
        fun create(
            id: EventId,
            name: EventName,
            date: LocalDate,
            joinCode: JoinCode,
        ): Event = Event(
            id = id,
            name = name,
            date = date,
            status = EventStatus.Preparing,
            joinCode = joinCode,
        )
    }
}
