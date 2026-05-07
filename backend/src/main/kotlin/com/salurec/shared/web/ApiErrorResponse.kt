package com.salurec.shared.web

/**
 * API エラーレスポンスの共通フォーマット。
 */
data class ApiErrorResponse(
    val code: String,
    val message: String,
    val details: Map<String, Any?> = emptyMap(),
)
