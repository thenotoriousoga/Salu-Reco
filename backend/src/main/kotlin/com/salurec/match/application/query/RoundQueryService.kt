package com.salurec.match.application.query

import com.salurec.match.application.query.dto.RoundDto
import com.salurec.match.application.query.dto.RoundListItemDto

/**
 * ラウンドの Read 側クエリサービスインターフェース。
 * 実装は Infrastructure 層で提供する。
 */
interface RoundQueryService {
    /**
     * 指定イベントのラウンド一覧を取得する。
     */
    fun listByEventId(eventId: String): List<RoundListItemDto>

    /**
     * 指定イベントに進行中のラウンドがあるか判定する。
     */
    fun hasOngoingRoundIn(eventId: String): Boolean
}
