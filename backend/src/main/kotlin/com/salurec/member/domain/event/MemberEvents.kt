package com.salurec.member.domain.event

import com.salurec.event.domain.model.EventId
import com.salurec.member.domain.model.MemberId
import com.salurec.shared.domain.DomainEvent
import java.time.Instant

data class MemberRegistered(
    val memberId: MemberId,
    val eventId: EventId,
    override val occurredAt: Instant = Instant.now(),
) : DomainEvent

data class MemberUpdated(
    val memberId: MemberId,
    override val occurredAt: Instant = Instant.now(),
) : DomainEvent

/** Event 作成時に幹事が初期メンバーとして登録された */
data class OrganizerRegistered(
    val memberId: MemberId,
    val eventId: EventId,
    override val occurredAt: Instant = Instant.now(),
) : DomainEvent
