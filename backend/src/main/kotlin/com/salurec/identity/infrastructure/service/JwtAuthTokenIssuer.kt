package com.salurec.identity.infrastructure.service

import com.salurec.identity.domain.model.AuthPrincipal
import com.salurec.identity.domain.model.Role
import com.salurec.identity.domain.service.AuthTokenIssuer
import com.salurec.identity.domain.service.IssuedToken
import com.salurec.shared.domain.Clock
import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.Date
import javax.crypto.SecretKey

/**
 * jjwt で JWT(HS256)を発行・検証する実装。
 */
@Component
class JwtAuthTokenIssuer(
    @Value("\${salurec.jwt.secret}") secret: String,
    @Value("\${salurec.jwt.expiration-minutes}") private val expirationMinutes: Long,
    private val clock: Clock,
) : AuthTokenIssuer {

    // HS256 は最低256bit必要。短い開発用シークレットでも安全に動くようSHA-256で派生鍵化する。
    private val key: SecretKey = Keys.hmacShaKeyFor(
        java.security.MessageDigest.getInstance("SHA-256")
            .digest(secret.toByteArray(Charsets.UTF_8)),
    )

    override fun issue(principal: AuthPrincipal): IssuedToken {
        val now = clock.now()
        val expiresAt = now.plusSeconds(expirationMinutes * 60)

        val token = Jwts.builder()
            .subject(if (principal.role == Role.ADMIN) "admin" else "user:${principal.eventId}")
            .claim(CLAIM_ROLE, principal.role.name)
            .also {
                if (principal.eventId != null) it.claim(CLAIM_EVENT_ID, principal.eventId)
            }
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiresAt))
            .signWith(key, Jwts.SIG.HS256)
            .compact()

        return IssuedToken(token = token, expiresAtEpochSeconds = expiresAt.epochSecond)
    }

    override fun verify(token: String): AuthPrincipal? {
        return try {
            val claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .payload

            val role = Role.valueOf(claims.get(CLAIM_ROLE, String::class.java))
            val eventId = claims.get(CLAIM_EVENT_ID, String::class.java)
            AuthPrincipal(role = role, eventId = eventId)
        } catch (_: JwtException) {
            null
        } catch (_: IllegalArgumentException) {
            null
        }
    }

    companion object {
        const val CLAIM_ROLE = "role"
        const val CLAIM_EVENT_ID = "eventId"
    }
}
