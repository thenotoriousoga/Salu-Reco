package com.salurec.match.application.command

import com.salurec.match.domain.event.MatchReopened
import com.salurec.match.domain.exception.MatchNotFoundException
import com.salurec.match.domain.exception.RoundNotFoundException
import com.salurec.match.domain.model.MatchId
import com.salurec.match.domain.model.RoundStatus
import com.salurec.match.domain.port.MatchRepository
import com.salurec.match.domain.port.RoundRepository
import com.salurec.shared.domain.DomainEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 試合を再開するユースケース。
 * 親ラウンドが Finished の場合は、同一トランザクションでラウンドも InProgress に戻す。
 */
@Service
class ReopenMatchUseCase(
    private val matchRepository: MatchRepository,
    private val roundRepository: RoundRepository,
    private val eventPublisher: DomainEventPublisher,
) {
    @Transactional
    fun execute(matchId: String) {
        val id = MatchId(matchId)
        val match = matchRepository.findById(id)
            ?: throw MatchNotFoundException(matchId)

        val reopenedMatch = match.reopen()
        matchRepository.save(reopenedMatch)

        // 親ラウンドが Finished なら自動で InProgress に戻す
        val round = roundRepository.findById(match.roundId)
            ?: throw RoundNotFoundException(match.roundId.value)

        if (round.status == RoundStatus.Finished) {
            val reopenedRound = round.reopen()
            roundRepository.save(reopenedRound)
        }

        eventPublisher.publish(MatchReopened(matchId = id, roundId = match.roundId))
    }
}
