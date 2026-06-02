package com.salurec.match.infrastructure.adapter

import com.salurec.event.application.port.RoundStatusPort
import com.salurec.event.domain.model.EventId
import com.salurec.match.infrastructure.persistence.repository.RoundJpaRepository
import org.springframework.stereotype.Component
import java.util.UUID

/**
 * RoundStatusPort の実装。
 * Event コンテキストが「当該イベントのラウンド状況」を問い合わせるために使用する。
 * StubRoundStatusAdapter を差し替える。
 */
@Component
class RoundStatusAdapter(
    private val roundJpaRepository: RoundJpaRepository,
) : RoundStatusPort {

    override fun countByEventId(eventId: EventId): Int =
        roundJpaRepository.countByEventId(UUID.fromString(eventId.value))

    override fun hasOngoingRoundIn(eventId: EventId): Boolean {
        val rounds = roundJpaRepository.findByEventIdOrderByRoundNumberAsc(UUID.fromString(eventId.value))
        return rounds.any { it.status == "InProgress" }
    }
}
