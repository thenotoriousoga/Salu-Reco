package com.salurec.identity.presentation.dto

import jakarta.validation.constraints.NotBlank

/** 管理者ログインリクエスト */
data class LoginAsAdminRequest(
    @field:NotBlank(message = "パスワードを入力してください")
    val password: String,
)

/** 参加コードログインリクエスト */
data class LoginWithJoinCodeRequest(
    @field:NotBlank(message = "参加コードを入力してください")
    val joinCode: String,
)

/** ログインレスポンス */
data class LoginResponse(
    val token: String,
    val role: String,
    val eventId: String?,
    val expiresAtEpochSeconds: Long,
)

/** 現在ログイン中のユーザ情報 */
data class MeResponse(
    val authenticated: Boolean,
    val role: String?,
    val eventId: String?,
)
