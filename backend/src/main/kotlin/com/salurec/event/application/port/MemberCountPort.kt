package com.salurec.event.application.port

import com.salurec.event.domain.model.EventId

/**
 * Member コンテキストから「当該イベントのメンバー数」を取得する Port。
 * 実装は Phase 4 で Member コンテキスト側の QueryService を呼ぶアダプタとして差し替える。
 */
interface MemberCountPort {
    fun countByEventId(eventId: EventId): Int
}
