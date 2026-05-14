package com.salurec.member.application.command

import com.salurec.event.domain.model.EventId
import com.salurec.event.domain.exception.EventNotFoundException
import com.salurec.event.domain.port.EventRepository
import com.salurec.member.application.dto.BulkRegisterMembersCommand
import com.salurec.member.domain.event.MemberRegistered
import com.salurec.member.domain.model.Member
import com.salurec.member.domain.model.MemberId
import com.salurec.member.domain.model.MemberName
import com.salurec.member.domain.port.MemberRepository
import com.salurec.shared.domain.DomainEventPublisher
import com.salurec.shared.domain.IdGenerator
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 複数メンバーをまとめてイベントに登録する。
 * 現行 GAS のキュー方式(画面で溜めて一括登録)を踏襲。
 */
@Service
class BulkRegisterMembersUseCase(
    private val memberRepository: MemberRepository,
    private val eventRepository: EventRepository,
    private val idGenerator: IdGenerator,
    private val eventPublisher: DomainEventPublisher,
) {
    @Transactional
    fun execute(command: BulkRegisterMembersCommand): List<String> {
        val eventId = EventId(command.eventId)
        eventRepository.findById(eventId)
            ?: throw EventNotFoundException(command.eventId)

        val members = command.members.map { input ->
            Member.create(
                id = MemberId(idGenerator.generate()),
                eventId = eventId,
                name = MemberName(input.name),
                seniorityYear = input.seniorityYear,
                soccerExperience = input.soccerExperience,
                isOrganizer = input.isOrganizer,
                note = input.note,
            )
        }

        val saved = memberRepository.saveAll(members)
        saved.forEach { eventPublisher.publish(MemberRegistered(it.id, eventId)) }

        return saved.map { it.id.value }
    }
}
