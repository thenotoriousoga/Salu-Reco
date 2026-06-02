package com.salurec.match.application.query

import com.salurec.match.application.query.dto.MatchDto
import com.salurec.match.application.query.dto.MatchListItemDto

/**
 * 試合の Read 側クエリサービスインターフェース。
 * 実装は Infrastructure 層で提供する。
 */
interface MatchQueryService {
    /**
     * 指定ラウンドの試合一覧を取得する。
     */
    fun listByRoundId(roundId: String): List<MatchListItemDto>

    /**
     * 指定ラウンドに進行中の試合があるか判定する。
     */
    fun hasOngoingMatchIn(roundId: String): Boolean

    /**
     * 指定イベントIDリストに対するラウンド数を取得する。
     */
    fun countRoundsByEventIds(eventIds: List<String>): Map<String, Int>
}
