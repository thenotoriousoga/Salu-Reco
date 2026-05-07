package com.salurec.identity.application.command.usecase

import com.salurec.identity.application.command.command.LoginAsAdminCommand
import com.salurec.identity.application.command.result.LoginResult
import com.salurec.identity.application.exception.InvalidCredentialsException
import com.salurec.identity.domain.model.AuthPrincipal
import com.salurec.identity.domain.model.Role
import com.salurec.identity.domain.service.AdminPasswordVerifier
import com.salurec.identity.domain.service.AuthTokenIssuer
import org.springframework.stereotype.Service

/**
 * 管理者パスワードログインのユースケース。
 */
@Service
class LoginAsAdminUseCase(
    private val passwordVerifier: AdminPasswordVerifier,
    private val tokenIssuer: AuthTokenIssuer,
) {
    fun execute(command: LoginAsAdminCommand): LoginResult {
        if (!passwordVerifier.matches(command.password)) {
            throw InvalidCredentialsException("パスワードが違います")
        }
        val principal = AuthPrincipal(role = Role.ADMIN, eventId = null)
        val issued = tokenIssuer.issue(principal)
        return LoginResult(
            token = issued.token,
            role = Role.ADMIN,
            eventId = null,
            expiresAtEpochSeconds = issued.expiresAtEpochSeconds,
        )
    }
}
