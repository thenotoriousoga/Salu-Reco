package com.salurec.event.application.command

import com.salurec.event.application.port.MemberCountPort
import com.salurec.event.domain.event.EventStarted
import com.salurec.event.domain.exception.EventNotFoundException
import com.salurec.event.domain.model.EventId
import com.salurec.event.domain.port.EventRepository
import com.salurec.shared.domain.DomainEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 準備中のイベントを進行中に遷移させる。
 * 他コンテキスト(Member)のメンバー数を Port 経由で取得し、Event 集約に渡して検証する。
 */
@Service
class StartEventUseCase(
    private val eventRepository: EventRepository,
    private val memberCountPort: MemberCountPort,
    private val eventPublisher: DomainEventPublisher,
) {
    @Transactional
    fun execute(eventId: String) {
        val id = EventId(eventId)
        val event = eventRepository.findById(id) ?: throw EventNotFoundException(eventId)

        val memberCount = memberCountPort.countByEventId(id)
        val started = event.start(memberCount = memberCount)
        eventRepository.save(started)

        eventPublisher.publish(EventStarted(id))
    }
}
