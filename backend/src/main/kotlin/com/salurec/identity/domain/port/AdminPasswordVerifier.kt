package com.salurec.identity.domain.port

/**
 * 管理者パスワードの一致を検証するインターフェース。
 * 実装はインフラ層で環境変数 ADMIN_PASSWORD と比較する。
 */
interface AdminPasswordVerifier {
    fun matches(input: String): Boolean
}
