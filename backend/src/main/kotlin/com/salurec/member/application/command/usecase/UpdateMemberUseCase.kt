package com.salurec.member.application.command.usecase

import com.salurec.member.application.command.command.UpdateMemberCommand
import com.salurec.member.application.exception.MemberNotFoundException
import com.salurec.member.domain.event.MemberUpdated
import com.salurec.member.domain.model.MemberId
import com.salurec.member.domain.model.MemberName
import com.salurec.member.domain.repository.MemberRepository
import com.salurec.shared.domain.DomainEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 管理者によるメンバー更新。名前・年次・経験・幹事フラグ・備考を一括更新する。
 */
@Service
class UpdateMemberUseCase(
    private val memberRepository: MemberRepository,
    private val eventPublisher: DomainEventPublisher,
) {
    @Transactional
    fun execute(command: UpdateMemberCommand) {
        val id = MemberId(command.memberId)
        val member = memberRepository.findById(id) ?: throw MemberNotFoundException(command.memberId)

        var updated = member
            .rename(MemberName(command.name))
            .updateSeniorityYear(command.seniorityYear)
            .updateExperience(command.soccerExperience)
            .updateNote(command.note)

        updated = if (command.isOrganizer) updated.markAsOrganizer() else updated.unmarkAsOrganizer()
        if (command.enthusiasm != null) {
            updated = updated.updateEnthusiasm(command.enthusiasm)
        }

        memberRepository.save(updated)
        eventPublisher.publish(MemberUpdated(id))
    }
}
