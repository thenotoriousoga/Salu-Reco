package com.salurec.identity.application.dto

import com.salurec.identity.domain.model.Role

/**
 * ログイン成功時の結果。
 * 参加者ログインの場合のみ eventId が設定される。
 */
data class LoginResult(
    val token: String,
    val role: Role,
    val eventId: String? = null,
    val expiresAtEpochSeconds: Long,
)
