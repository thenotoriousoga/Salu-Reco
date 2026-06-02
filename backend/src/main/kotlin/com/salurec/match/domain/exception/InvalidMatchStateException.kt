package com.salurec.match.domain.exception

import com.salurec.shared.domain.DomainException

/**
 * 試合の状態が不正な場合の例外。
 */
class InvalidMatchStateException(message: String) :
    DomainException(message)
