package com.salurec.match.domain.port

import com.salurec.match.domain.model.Match
import com.salurec.match.domain.model.MatchId

/**
 * Write 側の Match リポジトリ。
 * Read 向けの検索は MatchQueryService を使う。
 */
interface MatchRepository {
    fun save(match: Match): Match
    fun findById(id: MatchId): Match?

    /**
     * 指定ラウンドに進行中の試合が存在するか判定する。
     */
    fun existsOngoingByRoundId(roundId: String): Boolean
}
