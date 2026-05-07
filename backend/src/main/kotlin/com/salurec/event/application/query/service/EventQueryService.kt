package com.salurec.event.application.query.service

import com.salurec.event.application.query.dto.EventListItemDto

/**
 * Read 側のクエリサービス。
 * 集約を経由せず、JPQL constructor expression で直接 DTO へ射影する。
 */
interface EventQueryService {
    fun list(): List<EventListItemDto>
}
