package com.salurec.identity.application.command.usecase

import com.salurec.event.domain.model.JoinCode
import com.salurec.event.domain.repository.EventRepository
import com.salurec.identity.application.command.command.LoginWithJoinCodeCommand
import com.salurec.identity.application.command.result.LoginResult
import com.salurec.identity.application.exception.InvalidCredentialsException
import com.salurec.identity.domain.model.AuthPrincipal
import com.salurec.identity.domain.model.Role
import com.salurec.identity.domain.service.AuthTokenIssuer
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 参加コードによる参加者ログイン。
 * Event コンテキストに参加コードの妥当性確認を依存する。
 */
@Service
class LoginWithJoinCodeUseCase(
    private val eventRepository: EventRepository,
    private val tokenIssuer: AuthTokenIssuer,
) {
    @Transactional(readOnly = true)
    fun execute(command: LoginWithJoinCodeCommand): LoginResult {
        val code = try {
            JoinCode.from(command.joinCode)
        } catch (_: IllegalArgumentException) {
            throw InvalidCredentialsException("参加コードの形式が不正です")
        }

        val event = eventRepository.findByJoinCode(code)
            ?: throw InvalidCredentialsException("参加コードが見つかりません")

        val principal = AuthPrincipal(role = Role.USER, eventId = event.id.value)
        val issued = tokenIssuer.issue(principal)
        return LoginResult(
            token = issued.token,
            role = Role.USER,
            eventId = event.id.value,
            expiresAtEpochSeconds = issued.expiresAtEpochSeconds,
        )
    }
}
