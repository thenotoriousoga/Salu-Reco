package com.salurec.match.domain.model

/**
 * チーム名の値オブジェクト。空文字禁止、10文字以内。
 */
@JvmInline
value class TeamName(val value: String) {
    init {
        require(value.isNotBlank()) { "チーム名は空にできません" }
        require(value.length <= 10) { "チーム名は10文字以内です" }
    }
}
