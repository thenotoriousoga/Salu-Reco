package com.salurec.match.application.dto

import com.salurec.match.domain.model.MatchId

/**
 * 試合作成結果。
 */
data class CreateMatchResult(
    val matchId: MatchId,
)
