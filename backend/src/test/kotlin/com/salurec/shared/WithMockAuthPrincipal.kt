package com.salurec.shared

import com.salurec.identity.domain.model.AuthPrincipal
import com.salurec.identity.domain.model.Role
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContext
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.test.context.support.WithSecurityContext
import org.springframework.security.test.context.support.WithSecurityContextFactory

/**
 * テスト用: `AuthPrincipal` を SecurityContext の principal として注入するアノテーション。
 * `@WithMockUser` はデフォルトで `org.springframework.security.core.userdetails.User` を principal にするため、
 * Controller で `@AuthenticationPrincipal AuthPrincipal` を受ける場合は一致せず null になってしまう。
 * これを回避するためにカスタムアノテーションを用意する。
 */
@Target(AnnotationTarget.CLASS, AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
@WithSecurityContext(factory = WithMockAuthPrincipalSecurityContextFactory::class)
annotation class WithMockAuthPrincipal(
    val role: Role = Role.ADMIN,
    val eventId: String = "",
)

class WithMockAuthPrincipalSecurityContextFactory :
    WithSecurityContextFactory<WithMockAuthPrincipal> {

    override fun createSecurityContext(annotation: WithMockAuthPrincipal): SecurityContext {
        val principal = AuthPrincipal(
            role = annotation.role,
            eventId = annotation.eventId.ifBlank { null },
        )
        val auth = UsernamePasswordAuthenticationToken(
            principal,
            null,
            listOf(SimpleGrantedAuthority(principal.role.authority())),
        )
        val context = SecurityContextHolder.createEmptyContext()
        context.authentication = auth
        return context
    }
}
