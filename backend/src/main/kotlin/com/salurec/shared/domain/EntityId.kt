package com.salurec.shared.domain

/**
 * 全てのエンティティID値オブジェクトが実装するインターフェース。
 * 内部表現は文字列(UUID v7)とする。
 */
interface EntityId {
    val value: String
}
