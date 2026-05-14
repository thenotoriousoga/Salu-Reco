package com.salurec.identity.presentation.controller

import com.salurec.generated.api.AuthApi
import com.salurec.generated.model.LoginAsAdminRequest
import com.salurec.generated.model.LoginResponse
import com.salurec.generated.model.LoginWithJoinCodeRequest
import com.salurec.generated.model.MeResponse
import com.salurec.identity.application.command.command.LoginAsAdminCommand
import com.salurec.identity.application.command.command.LoginWithJoinCodeCommand
import com.salurec.identity.application.command.usecase.LoginAsAdminUseCase
import com.salurec.identity.application.command.usecase.LoginWithJoinCodeUseCase
import com.salurec.identity.application.exception.InvalidCredentialsException
import com.salurec.identity.domain.model.AuthPrincipal
import com.salurec.shared.web.ApiErrorResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestController

/**
 * 認証エンドポイント。
 * 生成された AuthApi インターフェースを実装する。
 * トークンはレスポンスボディで返し、Cookie 化はフロント(Next.js Route Handler)で行う。
 */
@RestController
class AuthController(
    private val loginAsAdminUseCase: LoginAsAdminUseCase,
    private val loginWithJoinCodeUseCase: LoginWithJoinCodeUseCase,
) : AuthApi {

    override fun loginAdmin(loginAsAdminRequest: LoginAsAdminRequest): ResponseEntity<LoginResponse> {
        val result = loginAsAdminUseCase.execute(LoginAsAdminCommand(password = loginAsAdminRequest.password))
        return ResponseEntity.ok(
            LoginResponse(
                token = result.token,
                role = LoginResponse.Role.valueOf(result.role.name),
                eventId = result.eventId,
                expiresAtEpochSeconds = result.expiresAtEpochSeconds,
            ),
        )
    }

    override fun loginWithCode(loginWithJoinCodeRequest: LoginWithJoinCodeRequest): ResponseEntity<LoginResponse> {
        val result = loginWithJoinCodeUseCase.execute(
            LoginWithJoinCodeCommand(joinCode = loginWithJoinCodeRequest.joinCode),
        )
        return ResponseEntity.ok(
            LoginResponse(
                token = result.token,
                role = LoginResponse.Role.valueOf(result.role.name),
                eventId = result.eventId,
                expiresAtEpochSeconds = result.expiresAtEpochSeconds,
            ),
        )
    }

    override fun me(): ResponseEntity<MeResponse> {
        val context = org.springframework.security.core.context.SecurityContextHolder.getContext()
        val principal = context.authentication?.principal as? AuthPrincipal
        return if (principal == null) {
            ResponseEntity.ok(MeResponse(authenticated = false, role = null, eventId = null))
        } else {
            ResponseEntity.ok(
                MeResponse(
                    authenticated = true,
                    role = MeResponse.Role.valueOf(principal.role.name),
                    eventId = principal.eventId,
                ),
            )
        }
    }

    @ExceptionHandler(InvalidCredentialsException::class)
    fun handleInvalidCredentials(ex: InvalidCredentialsException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            ApiErrorResponse(code = "INVALID_CREDENTIALS", message = ex.message ?: "認証に失敗しました"),
        )
}
