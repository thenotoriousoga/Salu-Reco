package com.salurec.event.infrastructure.adapter

import com.salurec.event.application.port.MemberCountPort
import com.salurec.event.domain.model.EventId
import org.springframework.stereotype.Component

/**
 * Phase 3 時点の仮実装。Member コンテキストが未実装のため固定値を返す。
 * Phase 4 で Member コンテキスト側の QueryService を呼ぶ実装に差し替える。
 *
 * 値を 2 (最低登録要件) にしているのは、API から start を呼んで動作確認できるようにするため。
 */
@Component
class StubMemberCountAdapter : MemberCountPort {
    override fun countByEventId(eventId: EventId): Int = 2
}
