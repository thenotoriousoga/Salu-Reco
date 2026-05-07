package com.salurec.identity.presentation.controller

import com.salurec.identity.application.command.command.LoginAsAdminCommand
import com.salurec.identity.application.command.command.LoginWithJoinCodeCommand
import com.salurec.identity.application.command.usecase.LoginAsAdminUseCase
import com.salurec.identity.application.command.usecase.LoginWithJoinCodeUseCase
import com.salurec.identity.application.exception.InvalidCredentialsException
import com.salurec.identity.domain.model.AuthPrincipal
import com.salurec.identity.presentation.dto.LoginAsAdminRequest
import com.salurec.identity.presentation.dto.LoginResponse
import com.salurec.identity.presentation.dto.LoginWithJoinCodeRequest
import com.salurec.identity.presentation.dto.MeResponse
import com.salurec.shared.web.ApiErrorResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/**
 * 認証エンドポイント。
 * トークンはレスポンスボディで返し、Cookie 化はフロント(Next.js Route Handler)で行う。
 */
@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val loginAsAdminUseCase: LoginAsAdminUseCase,
    private val loginWithJoinCodeUseCase: LoginWithJoinCodeUseCase,
) {

    @PostMapping("/login-admin")
    fun loginAdmin(@Valid @RequestBody request: LoginAsAdminRequest): LoginResponse {
        val result = loginAsAdminUseCase.execute(LoginAsAdminCommand(password = request.password))
        return LoginResponse(
            token = result.token,
            role = result.role.name,
            eventId = result.eventId,
            expiresAtEpochSeconds = result.expiresAtEpochSeconds,
        )
    }

    @PostMapping("/login-with-code")
    fun loginWithCode(@Valid @RequestBody request: LoginWithJoinCodeRequest): LoginResponse {
        val result = loginWithJoinCodeUseCase.execute(
            LoginWithJoinCodeCommand(joinCode = request.joinCode),
        )
        return LoginResponse(
            token = result.token,
            role = result.role.name,
            eventId = result.eventId,
            expiresAtEpochSeconds = result.expiresAtEpochSeconds,
        )
    }

    @GetMapping("/me")
    fun me(@AuthenticationPrincipal principal: AuthPrincipal?): MeResponse =
        if (principal == null) {
            MeResponse(authenticated = false, role = null, eventId = null)
        } else {
            MeResponse(
                authenticated = true,
                role = principal.role.name,
                eventId = principal.eventId,
            )
        }

    @ExceptionHandler(InvalidCredentialsException::class)
    fun handleInvalidCredentials(ex: InvalidCredentialsException): ResponseEntity<ApiErrorResponse> =
        ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            ApiErrorResponse(code = "INVALID_CREDENTIALS", message = ex.message ?: "認証に失敗しました"),
        )
}
