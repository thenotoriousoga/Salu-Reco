package com.salurec.identity.application.command.usecase

import com.salurec.identity.application.command.command.LoginAsAdminCommand
import com.salurec.identity.application.exception.InvalidCredentialsException
import com.salurec.identity.domain.model.AuthPrincipal
import com.salurec.identity.domain.model.Role
import com.salurec.identity.domain.service.AdminPasswordVerifier
import com.salurec.identity.domain.service.AuthTokenIssuer
import com.salurec.identity.domain.service.IssuedToken
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.mockk.every
import io.mockk.mockk

class LoginAsAdminUseCaseTest : DescribeSpec({

    describe("execute") {
        it("パスワードが正しければ ADMIN トークンを発行する") {
            val verifier = mockk<AdminPasswordVerifier>()
            every { verifier.matches("ok") } returns true

            val issuer = mockk<AuthTokenIssuer>()
            every { issuer.issue(match { it.role == Role.ADMIN }) } returns
                IssuedToken("jwt-admin", 9999L)

            val useCase = LoginAsAdminUseCase(verifier, issuer)
            val result = useCase.execute(LoginAsAdminCommand("ok"))

            result.token shouldBe "jwt-admin"
            result.role shouldBe Role.ADMIN
            result.eventId shouldBe null
            result.expiresAtEpochSeconds shouldBe 9999L
        }

        it("パスワードが違えば InvalidCredentialsException を投げる") {
            val verifier = mockk<AdminPasswordVerifier>()
            every { verifier.matches(any()) } returns false

            val issuer = mockk<AuthTokenIssuer>(relaxed = true)
            val useCase = LoginAsAdminUseCase(verifier, issuer)

            shouldThrow<InvalidCredentialsException> {
                useCase.execute(LoginAsAdminCommand("ng"))
            }
        }
    }

    describe("AuthPrincipal") {
        it("USER ロールには eventId が必須") {
            shouldThrow<IllegalArgumentException> {
                AuthPrincipal(role = Role.USER, eventId = null)
            }
        }

        it("ADMIN は全イベントにアクセス可") {
            val principal = AuthPrincipal(role = Role.ADMIN)
            principal.canAccessEvent("any") shouldBe true
        }

        it("USER は自分の eventId のみアクセス可") {
            val principal = AuthPrincipal(role = Role.USER, eventId = "E1")
            principal.canAccessEvent("E1") shouldBe true
            principal.canAccessEvent("E2") shouldBe false
        }
    }
})
