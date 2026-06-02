package com.salurec.match.application.port

import com.salurec.match.application.query.dto.MatchDataDto

/**
 * MVP コンテキストへ試合データを公開するポート。
 * Phase 6 で実装を追加する。
 */
interface MatchQueryPort {
    /**
     * 指定イベントの全試合データを MVP 評価用に取得する。
     */
    fun getMatchDataForMvp(eventId: String): List<MatchDataDto>
}
