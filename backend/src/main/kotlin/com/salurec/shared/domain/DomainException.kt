package com.salurec.shared.domain

/**
 * ドメイン層の例外基底クラス。
 * 各コンテキストはこれを継承して業務例外を定義する。
 */
abstract class DomainException(
    message: String,
    cause: Throwable? = null,
) : RuntimeException(message, cause)
