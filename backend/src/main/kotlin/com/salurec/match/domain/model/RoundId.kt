package com.salurec.match.domain.model

import com.salurec.shared.domain.EntityId

/**
 * Round の ID 値オブジェクト。UUID v7 文字列を保持する。
 */
@JvmInline
value class RoundId(override val value: String) : EntityId {
    init {
        require(value.isNotBlank()) { "RoundIdは空にできません" }
        require(value.length <= 36) { "RoundIdは36文字以内です" }
    }
}
