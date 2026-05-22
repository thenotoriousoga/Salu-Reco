package com.salurec.event.application.command

import com.salurec.event.application.port.RoundStatusPort
import com.salurec.event.domain.event.EventFinished
import com.salurec.event.domain.exception.EventNotFoundException
import com.salurec.event.domain.model.EventId
import com.salurec.event.domain.port.EventRepository
import com.salurec.shared.domain.DomainEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 進行中のイベントを終了に遷移させる。
 * Round コンテキストから「進行中ラウンドの有無」「ラウンド数」を Port 経由で取得する。
 */
@Service
class FinishEventUseCase(
    private val eventRepository: EventRepository,
    private val roundStatusPort: RoundStatusPort,
    private val eventPublisher: DomainEventPublisher,
) {
    @Transactional
    fun execute(eventId: String) {
        val id = EventId(eventId)
        val event = eventRepository.findById(id) ?: throw EventNotFoundException(eventId)

        val finished = event.finish(
            roundCount = roundStatusPort.countByEventId(id),
            hasOngoingRound = roundStatusPort.hasOngoingRoundIn(id),
        )
        eventRepository.save(finished)

        eventPublisher.publish(EventFinished(id))
    }
}
