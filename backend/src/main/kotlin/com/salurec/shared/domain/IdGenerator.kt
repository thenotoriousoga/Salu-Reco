package com.salurec.shared.domain

/**
 * エンティティID生成のインターフェース。
 * ドメイン層はこれを通じてID文字列を得る(フレームワーク非依存)。
 */
interface IdGenerator {
    fun generate(): String
}
