package com.salurec.event.application.port

import com.salurec.event.domain.model.EventId

/**
 * Match Operation コンテキストから「当該イベントのラウンド状況」を取得する Port。
 * 実装は Phase 5 で差し替える。
 */
interface RoundStatusPort {
    /** 当該イベントに存在するラウンド数 */
    fun countByEventId(eventId: EventId): Int

    /** 当該イベントに進行中(Finished でない)ラウンドがあるか */
    fun hasOngoingRoundIn(eventId: EventId): Boolean
}
