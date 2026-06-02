package com.salurec.match.application.command

import com.salurec.match.domain.event.MatchFinished
import com.salurec.match.domain.exception.MatchNotFoundException
import com.salurec.match.domain.model.MatchId
import com.salurec.match.domain.port.MatchRepository
import com.salurec.shared.domain.DomainEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 試合を終了するユースケース。
 * 現在のゴールと参加者をそのまま確定する。
 */
@Service
class FinishMatchUseCase(
    private val matchRepository: MatchRepository,
    private val eventPublisher: DomainEventPublisher,
) {
    @Transactional
    fun execute(matchId: String) {
        val id = MatchId(matchId)
        val match = matchRepository.findById(id)
            ?: throw MatchNotFoundException(matchId)

        // 現在の状態をそのまま確定（追加のゴールや助っ人はなし）
        val finished = match.finish(goals = match.goals, newSubs = emptyList())

        matchRepository.save(finished)
        eventPublisher.publish(MatchFinished(matchId = id, roundId = match.roundId))
    }
}
