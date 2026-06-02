package com.salurec.match.domain.port

import com.salurec.event.domain.model.EventId
import com.salurec.match.domain.model.Round
import com.salurec.match.domain.model.RoundId

/**
 * Write 側の Round リポジトリ。
 * Read 向けの検索は RoundQueryService を使う。
 */
interface RoundRepository {
    fun save(round: Round): Round
    fun findById(id: RoundId): Round?
    fun countByEventId(eventId: EventId): Int
}
