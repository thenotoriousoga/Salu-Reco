package com.salurec.match.infrastructure.adapter

import com.salurec.match.application.port.MatchQueryPort
import com.salurec.match.application.query.dto.MatchDataDto
import org.springframework.stereotype.Component

/**
 * MatchQueryPort の実装。
 * Phase 6（MVP 評価）で実装を追加する。現時点では空リストを返す。
 */
@Component
class MatchQueryPortAdapter : MatchQueryPort {

    override fun getMatchDataForMvp(eventId: String): List<MatchDataDto> {
        // Phase 6 で実装予定
        return emptyList()
    }
}
