package com.salurec.identity.domain.model

/**
 * 認証済みリクエストを表す値オブジェクト。
 * JWT のペイロードから復元される。
 */
data class AuthPrincipal(
    val role: Role,
    /** USER ロール時のみ設定(どのイベントにアクセスできるか) */
    val eventId: String? = null,
) {
    init {
        if (role == Role.USER) {
            requireNotNull(eventId) { "USER ロールには eventId が必要です" }
        }
    }

    fun isAdmin(): Boolean = role == Role.ADMIN
    fun canAccessEvent(targetEventId: String): Boolean =
        isAdmin() || eventId == targetEventId
}
