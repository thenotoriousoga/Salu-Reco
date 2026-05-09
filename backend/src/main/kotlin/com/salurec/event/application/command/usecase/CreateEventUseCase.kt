package com.salurec.event.application.command.usecase

import com.salurec.event.application.command.command.CreateEventCommand
import com.salurec.event.application.command.result.CreateEventResult
import com.salurec.event.application.port.MemberRegistrationPort
import com.salurec.event.domain.event.EventCreated
import com.salurec.event.domain.model.Event
import com.salurec.event.domain.model.EventId
import com.salurec.event.domain.model.EventName
import com.salurec.event.domain.repository.EventRepository
import com.salurec.event.domain.service.JoinCodeGenerator
import com.salurec.shared.domain.DomainEventPublisher
import com.salurec.shared.domain.IdGenerator
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * イベントを新規作成するユースケース。
 * `organizerName` が指定されていれば、Member コンテキストに幹事メンバーを登録する。
 */
@Service
class CreateEventUseCase(
    private val eventRepository: EventRepository,
    private val joinCodeGenerator: JoinCodeGenerator,
    private val memberRegistration: MemberRegistrationPort,
    private val idGenerator: IdGenerator,
    private val eventPublisher: DomainEventPublisher,
) {
    @Transactional
    fun execute(command: CreateEventCommand): CreateEventResult {
        val eventId = EventId(idGenerator.generate())
        val joinCode = joinCodeGenerator.generateUnique()

        val event = Event.create(
            id = eventId,
            name = EventName(command.name),
            date = command.date,
            joinCode = joinCode,
        )
        val saved = eventRepository.save(event)

        val organizerMemberId = command.organizerName?.takeIf { it.isNotBlank() }?.let {
            memberRegistration.registerOrganizer(eventId = saved.id, name = it)
        }

        eventPublisher.publish(EventCreated(saved.id))

        return CreateEventResult(
            eventId = saved.id,
            joinCode = saved.joinCode,
            organizerMemberId = organizerMemberId,
        )
    }
}
