package com.salurec.match.application.command

import com.salurec.match.domain.event.RoundReopened
import com.salurec.match.domain.exception.RoundNotFoundException
import com.salurec.match.domain.model.RoundId
import com.salurec.match.domain.port.RoundRepository
import com.salurec.shared.domain.DomainEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * ラウンドを再開するユースケース。
 */
@Service
class ReopenRoundUseCase(
    private val roundRepository: RoundRepository,
    private val eventPublisher: DomainEventPublisher,
) {
    @Transactional
    fun execute(roundId: String) {
        val id = RoundId(roundId)
        val round = roundRepository.findById(id)
            ?: throw RoundNotFoundException(roundId)

        val reopened = round.reopen()

        roundRepository.save(reopened)
        eventPublisher.publish(RoundReopened(roundId = id))
    }
}
