package com.salurec.identity.domain.model

/**
 * アプリ内のロール。
 * - ADMIN: 管理者。全イベントを操作可
 * - USER : 参加者。特定イベントのみ閲覧・限定操作
 */
enum class Role {
    ADMIN,
    USER,
    ;

    /** Spring Security 互換のロール文字列("ROLE_" プレフィクスあり) */
    fun authority(): String = "ROLE_$name"
}
