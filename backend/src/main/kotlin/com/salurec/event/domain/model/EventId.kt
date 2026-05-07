package com.salurec.event.domain.model

import com.salurec.shared.domain.EntityId

/**
 * Event の ID 値オブジェクト。UUID v7 文字列を保持する。
 */
@JvmInline
value class EventId(override val value: String) : EntityId {
    init {
        require(value.isNotBlank()) { "EventIdは空にできません" }
        require(value.length <= 36) { "EventIdは36文字以内です" }
    }
}
