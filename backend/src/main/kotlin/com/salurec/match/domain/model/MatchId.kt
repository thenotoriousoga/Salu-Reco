package com.salurec.match.domain.model

import com.salurec.shared.domain.EntityId

/**
 * Match の ID 値オブジェクト。UUID v7 文字列を保持する。
 */
@JvmInline
value class MatchId(override val value: String) : EntityId {
    init {
        require(value.isNotBlank()) { "MatchIdは空にできません" }
        require(value.length <= 36) { "MatchIdは36文字以内です" }
    }
}
