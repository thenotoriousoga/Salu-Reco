package com.salurec.event.infrastructure.adapter

import com.salurec.event.application.port.RoundStatusPort
import com.salurec.event.domain.model.EventId
import org.springframework.stereotype.Component

/**
 * Phase 3 時点の仮実装。Match Operation コンテキストが未実装のため固定値を返す。
 * Phase 5 で差し替える。
 *
 * - countByEventId: 常に 1 を返して finish が動作確認できるようにする
 * - hasOngoingRoundIn: 常に false(進行中のラウンドなし)
 */
@Component
class StubRoundStatusAdapter : RoundStatusPort {
    override fun countByEventId(eventId: EventId): Int = 1
    override fun hasOngoingRoundIn(eventId: EventId): Boolean = false
}
