package com.salurec.match.domain.model

import com.salurec.shared.domain.EntityId

/**
 * Goal の ID 値オブジェクト。UUID v7 文字列を保持する。
 */
@JvmInline
value class GoalId(override val value: String) : EntityId {
    init {
        require(value.isNotBlank()) { "GoalIdは空にできません" }
        require(value.length <= 36) { "GoalIdは36文字以内です" }
    }
}
