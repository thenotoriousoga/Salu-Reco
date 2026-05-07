package com.salurec.identity.infrastructure.security

import com.salurec.identity.domain.service.AuthTokenIssuer
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * `Authorization: Bearer <JWT>` ヘッダを検証して SecurityContext に Principal を載せる。
 * 検証失敗時はヘッダを無視する(匿名として扱う)。認可は後続フィルタが判断する。
 */
@Component
class JwtAuthenticationFilter(
    private val tokenIssuer: AuthTokenIssuer,
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        val header = request.getHeader("Authorization")
        val token = header?.takeIf { it.startsWith("Bearer ", ignoreCase = true) }
            ?.substring(7)
            ?.trim()

        if (!token.isNullOrEmpty() && SecurityContextHolder.getContext().authentication == null) {
            val principal = tokenIssuer.verify(token)
            if (principal != null) {
                val auth = UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    listOf(SimpleGrantedAuthority(principal.role.authority())),
                )
                auth.details = WebAuthenticationDetailsSource().buildDetails(request)
                SecurityContextHolder.getContext().authentication = auth
            }
        }

        filterChain.doFilter(request, response)
    }
}
