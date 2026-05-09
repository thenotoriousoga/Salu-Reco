package com.salurec.member.domain.model

@JvmInline
value class MemberName(val value: String) {
    init {
        require(value.isNotBlank()) { "メンバー名を入力してください" }
        require(value.length <= 50) { "メンバー名は50文字以内です" }
    }
}
