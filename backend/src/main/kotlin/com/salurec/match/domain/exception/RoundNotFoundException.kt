package com.salurec.match.domain.exception

import com.salurec.shared.domain.DomainException

/**
 * 指定されたラウンドが見つからない場合の例外。
 */
class RoundNotFoundException(roundId: String) :
    DomainException("ラウンドが見つかりません: roundId=$roundId")
