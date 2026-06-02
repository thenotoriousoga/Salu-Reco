package com.salurec.identity.infrastructure.security

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.salurec.shared.web.ApiErrorResponse
import jakarta.servlet.http.HttpServletResponse
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter

/**
 * Spring Security の全体設定。
 *
 * 設計方針:
 * - セッション無効(ステートレス、JWT ベース)
 * - CSRF 無効(Bearer トークンを使うため)
 * - 認可は URL パターン + HTTP メソッドで一括定義(@PreAuthorize は使わない)
 *   → Controller がフレームワーク非依存に保たれ、ポリシーが一箇所に集約される
 * - 「特定のイベントへのアクセス可否」のような動的認可は Controller で AuthPrincipal を使って判定する
 *   (URL パターンでは表現できない業務ロジックのため)
 */
@Configuration
class SecurityConfig(
    private val jwtAuthenticationFilter: JwtAuthenticationFilter,
) {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        val mapper = jacksonObjectMapper()

        http
            .csrf { it.disable() }
            .cors { }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .httpBasic { it.disable() }
            .formLogin { it.disable() }
            .logout(AbstractHttpConfigurer<*, *>::disable)
            .authorizeHttpRequests { auth ->
                auth
                    // --- 公開エンドポイント(認証不要) ---
                    .requestMatchers(
                        "/api/auth/login-admin",
                        "/api/auth/login-with-code",
                    ).permitAll()
                    .requestMatchers(
                        "/actuator/**",
                        "/v3/api-docs/**",
                        "/swagger-ui/**",
                        "/swagger-ui.html",
                    ).permitAll()

                    // --- 認証済みなら誰でも叩ける ---
                    .requestMatchers("/api/auth/me").authenticated()

                    // --- Event コンテキスト: 作成/一覧は管理者のみ ---
                    .requestMatchers(HttpMethod.POST, "/api/events").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.GET, "/api/events").hasRole("ADMIN")

                    // --- Event コンテキスト: ステータス遷移は管理者のみ ---
                    .requestMatchers(HttpMethod.POST, "/api/events/*/start").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.POST, "/api/events/*/finish").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.POST, "/api/events/*/reopen").hasRole("ADMIN")

                    // --- Event コンテキスト: 詳細は ADMIN もしくは USER(ただし該当イベントのみ)
                    //     「該当イベントのみ」の判定は Controller で AuthPrincipal.canAccessEvent を使う ---
                    .requestMatchers(HttpMethod.GET, "/api/events/*").hasAnyRole("ADMIN", "USER")

                    // --- Member コンテキスト: 登録/更新/削除は管理者のみ ---
                    .requestMatchers(HttpMethod.POST, "/api/events/*/members").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.PUT, "/api/events/*/members/*").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.DELETE, "/api/events/*/members/*").hasRole("ADMIN")

                    // --- Member コンテキスト: 意気込み更新はメンバー本人 (USER) 可、
                    //     実際の本人判定は Controller 内で AuthPrincipal.canAccessEvent + eventId で担保 ---
                    .requestMatchers(HttpMethod.PUT, "/api/events/*/members/*/enthusiasm")
                        .hasAnyRole("ADMIN", "USER")

                    // --- Member コンテキスト: 一覧は ADMIN もしくは当該イベント USER ---
                    .requestMatchers(HttpMethod.GET, "/api/events/*/members").hasAnyRole("ADMIN", "USER")

                    // --- Round コンテキスト: 作成/終了/再開は管理者のみ ---
                    .requestMatchers(HttpMethod.POST, "/api/events/*/rounds").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.POST, "/api/events/*/rounds/*/finish").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.POST, "/api/events/*/rounds/*/reopen").hasRole("ADMIN")

                    // --- Round コンテキスト: 一覧/詳細は ADMIN + USER ---
                    .requestMatchers(HttpMethod.GET, "/api/events/*/rounds").hasAnyRole("ADMIN", "USER")
                    .requestMatchers(HttpMethod.GET, "/api/events/*/rounds/*").hasAnyRole("ADMIN", "USER")

                    // --- Match コンテキスト: 作成/得点/助っ人/終了/再開は管理者のみ ---
                    .requestMatchers(HttpMethod.POST, "/api/events/*/rounds/*/matches").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.POST, "/api/events/*/rounds/*/matches/*/goals").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.DELETE, "/api/events/*/rounds/*/matches/*/goals/*").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.POST, "/api/events/*/rounds/*/matches/*/substitutes").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.POST, "/api/events/*/rounds/*/matches/*/finish").hasRole("ADMIN")
                    .requestMatchers(HttpMethod.POST, "/api/events/*/rounds/*/matches/*/reopen").hasRole("ADMIN")

                    // --- Match コンテキスト: 一覧/詳細は ADMIN + USER ---
                    .requestMatchers(HttpMethod.GET, "/api/events/*/rounds/*/matches").hasAnyRole("ADMIN", "USER")
                    .requestMatchers(HttpMethod.GET, "/api/events/*/rounds/*/matches/*").hasAnyRole("ADMIN", "USER")

                    // --- デフォルト: 認証必須(追加エンドポイント増やしたときに意図しない公開を防ぐ) ---
                    .anyRequest().authenticated()
            }
            .exceptionHandling { ex ->
                ex.authenticationEntryPoint { _, response, _ ->
                    response.status = HttpServletResponse.SC_UNAUTHORIZED
                    response.contentType = MediaType.APPLICATION_JSON_VALUE
                    response.characterEncoding = "UTF-8"
                    response.writer.write(
                        mapper.writeValueAsString(
                            ApiErrorResponse(
                                code = "UNAUTHENTICATED",
                                message = "認証が必要です",
                            ),
                        ),
                    )
                }
                ex.accessDeniedHandler { _, response, _ ->
                    response.status = HttpServletResponse.SC_FORBIDDEN
                    response.contentType = MediaType.APPLICATION_JSON_VALUE
                    response.characterEncoding = "UTF-8"
                    response.writer.write(
                        mapper.writeValueAsString(
                            ApiErrorResponse(
                                code = "FORBIDDEN",
                                message = "このリソースへのアクセス権限がありません",
                            ),
                        ),
                    )
                }
            }
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }
}
