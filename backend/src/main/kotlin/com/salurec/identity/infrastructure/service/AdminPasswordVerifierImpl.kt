package com.salurec.identity.infrastructure.service

import com.salurec.identity.domain.port.AdminPasswordVerifier
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.security.MessageDigest

/**
 * 環境変数 `ADMIN_PASSWORD`(application.yml の salurec.admin-password 経由)と
 * 入力を比較する。定数時間比較でタイミング攻撃を防ぐ。
 */
@Component
class AdminPasswordVerifierImpl(
    @Value("\${salurec.admin-password}") private val adminPassword: String,
) : AdminPasswordVerifier {

    override fun matches(input: String): Boolean {
        val expected = adminPassword.toByteArray(Charsets.UTF_8)
        val actual = input.toByteArray(Charsets.UTF_8)
        return MessageDigest.isEqual(expected, actual)
    }
}
