package com.salurec.event.application.command

import com.salurec.event.domain.event.EventReopened
import com.salurec.event.domain.exception.EventNotFoundException
import com.salurec.event.domain.model.EventId
import com.salurec.event.domain.port.EventRepository
import com.salurec.shared.domain.DomainEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 終了状態のイベントを進行中に戻す。
 */
@Service
class ReopenEventUseCase(
    private val eventRepository: EventRepository,
    private val eventPublisher: DomainEventPublisher,
) {
    @Transactional
    fun execute(eventId: String) {
        val id = EventId(eventId)
        val event = eventRepository.findById(id) ?: throw EventNotFoundException(eventId)

        val reopened = event.reopen()
        eventRepository.save(reopened)

        eventPublisher.publish(EventReopened(id))
    }
}
