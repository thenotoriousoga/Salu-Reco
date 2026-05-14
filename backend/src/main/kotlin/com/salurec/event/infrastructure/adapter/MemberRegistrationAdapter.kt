package com.salurec.event.infrastructure.adapter

import com.salurec.event.application.port.MemberRegistrationPort
import com.salurec.event.domain.model.EventId
import com.salurec.member.domain.event.OrganizerRegistered
import com.salurec.member.domain.model.Member
import com.salurec.member.domain.model.MemberId
import com.salurec.member.domain.model.MemberName
import com.salurec.member.domain.model.SoccerExperience
import com.salurec.member.domain.port.MemberRepository
import com.salurec.shared.domain.DomainEventPublisher
import com.salurec.shared.domain.IdGenerator
import org.springframework.stereotype.Component

/**
 * Event 作成時に幹事を初期メンバーとして登録する実装。
 */
@Component
class MemberRegistrationAdapter(
    private val memberRepository: MemberRepository,
    private val idGenerator: IdGenerator,
    private val eventPublisher: DomainEventPublisher,
) : MemberRegistrationPort {

    override fun registerOrganizer(eventId: EventId, name: String): String {
        val memberId = MemberId(idGenerator.generate())
        val member = Member.create(
            id = memberId,
            eventId = eventId,
            name = MemberName(name),
            // 既存 GAS の「イベント作成フォーム」は年次と経験を聞かないので、暫定値として
            // 1年目 / 経験なしで登録する。幹事本人が後からメンバー一覧から編集できる。
            seniorityYear = 1,
            soccerExperience = SoccerExperience.Inexperienced,
            isOrganizer = true,
        )
        memberRepository.save(member)
        eventPublisher.publish(OrganizerRegistered(memberId, eventId))
        return memberId.value
    }
}
