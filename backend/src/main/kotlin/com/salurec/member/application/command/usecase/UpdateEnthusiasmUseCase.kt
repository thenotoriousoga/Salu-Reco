package com.salurec.member.application.command.usecase

import com.salurec.member.application.command.command.UpdateEnthusiasmCommand
import com.salurec.member.application.exception.MemberNotFoundException
import com.salurec.member.domain.event.MemberUpdated
import com.salurec.member.domain.model.MemberId
import com.salurec.member.domain.repository.MemberRepository
import com.salurec.shared.domain.DomainEventPublisher
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * メンバー本人による意気込みの更新。
 * 認可(本人チェック)は Presentation 層で AuthPrincipal.canAccessEvent + member.eventId の一致で判定する。
 * さらに「同じイベントの他人を書き換えられない」制約が必要だが、Phase 4 時点では
 * 「参加者ログインはイベント単位」のため簡易的に AuthPrincipal.canAccessEvent だけ確認する。
 */
@Service
class UpdateEnthusiasmUseCase(
    private val memberRepository: MemberRepository,
    private val eventPublisher: DomainEventPublisher,
) {
    @Transactional
    fun execute(command: UpdateEnthusiasmCommand) {
        val id = MemberId(command.memberId)
        val member = memberRepository.findById(id) ?: throw MemberNotFoundException(command.memberId)

        val updated = member.updateEnthusiasm(command.enthusiasm)
        memberRepository.save(updated)
        eventPublisher.publish(MemberUpdated(id))
    }
}
