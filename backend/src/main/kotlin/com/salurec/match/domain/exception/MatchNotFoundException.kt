package com.salurec.match.domain.exception

import com.salurec.shared.domain.DomainException

/**
 * 指定された試合が見つからない場合の例外。
 */
class MatchNotFoundException(matchId: String) :
    DomainException("試合が見つかりません: matchId=$matchId")
