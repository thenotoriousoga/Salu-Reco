package com.salurec.identity.domain.exception

import com.salurec.shared.domain.DomainException

/**
 * ログイン資格情報が一致しない場合の例外。
 * Presentation 層で 401 を返すのに使う。
 */
class InvalidCredentialsException(message: String) : DomainException(message)
