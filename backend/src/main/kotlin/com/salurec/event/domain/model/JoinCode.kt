package com.salurec.event.domain.model

/**
 * イベント参加コードを表す値オブジェクト。
 * 紛らわしい文字(0/O, 1/I/L)を除いた英数字で4〜5文字。
 */
@JvmInline
value class JoinCode(val value: String) {
    init {
        require(value.length in LENGTH_RANGE) { "参加コードは${LENGTH_RANGE.first}〜${LENGTH_RANGE.last}文字です" }
        require(value.all { it in ALLOWED_CHARS }) { "参加コードに使用できない文字が含まれています" }
    }

    companion object {
        /** 使用可能な文字(紛らわしい 0,O,1,I,L を除く) */
        const val ALLOWED_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
        val LENGTH_RANGE = 4..5

        /**
         * ユーザー入力を大文字化・トリムして JoinCode に変換する。
         */
        fun from(raw: String): JoinCode = JoinCode(raw.trim().uppercase())
    }
}
