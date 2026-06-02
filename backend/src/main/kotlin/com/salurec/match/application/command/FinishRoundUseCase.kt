package com.salurec.match.application.command

import com.salurec.match.domain.event.RoundFinished
import com.salurec.match.domain.exception.RoundNotFoundException
import com.salurec.match.domain.model.RoundId
import com.salurec.match.domain.port.MatchRepository
import com.salurec.match.domain.port.RoundRepository
import com.salurec.shared.domain.DomainEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * ラウンドを終了するユースケース。
 * 配下に進行中の試合がないことを確認してから終了する。
 */
@Service
class FinishRoundUseCase(
    private val roundRepository: RoundRepository,
    private val matchRepository: MatchRepository,
    private val eventPublisher: DomainEventPublisher,
) {
    @Transactional
    fun execute(roundId: String) {
        val id = RoundId(roundId)
        val round = roundRepository.findById(id)
            ?: throw RoundNotFoundException(roundId)

        val hasOngoingMatch = matchRepository.existsOngoingByRoundId(roundId)
        val finished = round.finish(hasOngoingMatch)

        roundRepository.save(finished)
        eventPublisher.publish(RoundFinished(roundId = id))
    }
}
