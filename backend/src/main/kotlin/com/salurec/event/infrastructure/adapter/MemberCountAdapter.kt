package com.salurec.event.infrastructure.adapter

import com.salurec.event.application.port.MemberCountPort
import com.salurec.event.domain.model.EventId
import com.salurec.member.domain.port.MemberRepository
import org.springframework.context.annotation.Primary
import org.springframework.stereotype.Component

/**
 * Member コンテキストの Repository 経由で実カウントを返す実装。
 * Phase 4 で StubMemberCountAdapter から差し替えるため @Primary を付けている。
 */
@Primary
@Component
class MemberCountAdapter(
    private val memberRepository: MemberRepository,
) : MemberCountPort {
    override fun countByEventId(eventId: EventId): Int =
        memberRepository.countByEventId(eventId)
}
