package com.salurec.member.domain.event

import com.salurec.event.domain.model.EventId
import com.salurec.member.domain.model.MemberId
import com.salurec.shared.domain.DomainEvent
import java.time.Instant

/** メンバーが削除された */
data class MemberDeleted(
    val memberId: MemberId,
    val eventId: EventId,
    override val occurredAt: Instant = Instant.now(),
) : DomainEvent
