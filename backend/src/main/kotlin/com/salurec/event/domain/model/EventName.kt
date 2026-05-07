package com.salurec.event.domain.model

/**
 * イベント名を表す値オブジェクト。1〜100文字。
 */
@JvmInline
value class EventName(val value: String) {
    init {
        require(value.isNotBlank()) { "イベント名を入力してください" }
        require(value.length <= 100) { "イベント名は100文字以内です" }
    }
}
