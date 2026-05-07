package com.salurec.event.domain.repository

import com.salurec.event.domain.model.Event
import com.salurec.event.domain.model.EventId
import com.salurec.event.domain.model.JoinCode

/**
 * Write 側の Event リポジトリ。
 * Read 向けの検索は EventQueryService を使う。
 */
interface EventRepository {
    fun save(event: Event): Event
    fun findById(id: EventId): Event?
    fun findByJoinCode(code: JoinCode): Event?
    fun existsByJoinCode(code: JoinCode): Boolean
    fun delete(id: EventId)
}
