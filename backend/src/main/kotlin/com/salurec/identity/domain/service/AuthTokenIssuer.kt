package com.salurec.identity.domain.service

import com.salurec.identity.domain.model.AuthPrincipal

/**
 * JWT のような認証トークンを発行・検証するインターフェース。
 * 実装は Infrastructure 層で jjwt を使って対称鍵署名する。
 */
interface AuthTokenIssuer {
    fun issue(principal: AuthPrincipal): IssuedToken
    fun verify(token: String): AuthPrincipal?
}

data class IssuedToken(
    val token: String,
    val expiresAtEpochSeconds: Long,
)
