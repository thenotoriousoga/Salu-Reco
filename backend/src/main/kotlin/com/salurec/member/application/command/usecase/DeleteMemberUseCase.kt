package com.salurec.member.application.command.usecase

import com.salurec.member.application.exception.MemberNotFoundException
import com.salurec.member.domain.event.MemberDeleted
import com.salurec.member.domain.model.MemberId
import com.salurec.member.domain.repository.MemberRepository
import com.salurec.shared.domain.DomainEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class DeleteMemberUseCase(
    private val memberRepository: MemberRepository,
    private val eventPublisher: DomainEventPublisher,
) {
    @Transactional
    fun execute(memberId: String) {
        val id = MemberId(memberId)
        val member = memberRepository.findById(id) ?: throw MemberNotFoundException(memberId)
        memberRepository.delete(id)
        eventPublisher.publish(MemberDeleted(id, member.eventId))
    }
}
