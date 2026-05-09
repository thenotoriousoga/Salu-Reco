package com.salurec.member.domain.model

import com.salurec.shared.domain.EntityId

@JvmInline
value class MemberId(override val value: String) : EntityId {
    init {
        require(value.isNotBlank()) { "MemberIdは空にできません" }
        require(value.length <= 36) { "MemberIdは36文字以内です" }
    }
}
