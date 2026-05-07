package com.salurec.event.infrastructure.persistence.mapper

import com.salurec.event.domain.model.Event
import com.salurec.event.domain.model.EventId
import com.salurec.event.domain.model.EventName
import com.salurec.event.domain.model.EventStatus
import com.salurec.event.domain.model.JoinCode
import com.salurec.event.infrastructure.persistence.entity.EventJpaEntity
import java.util.UUID

/**
 * Event ドメインモデルと JPA Entity を変換する。
 */
object EventEntityMapper {

    fun toDomain(entity: EventJpaEntity): Event = Event(
        id = EventId(entity.id.toString()),
        name = EventName(entity.name),
        date = entity.eventDate,
        status = EventStatus.valueOf(entity.status),
        joinCode = JoinCode(entity.joinCode),
    )

    fun toEntity(domain: Event): EventJpaEntity = EventJpaEntity(
        id = UUID.fromString(domain.id.value),
        name = domain.name.value,
        eventDate = domain.date,
        status = domain.status.name,
        joinCode = domain.joinCode.value,
    )

    /**
     * 既存 Entity にドメインの状態を反映する(更新用)。
     * id と joinCode は不変として扱う。
     */
    fun applyDomain(entity: EventJpaEntity, domain: Event) {
        entity.name = domain.name.value
        entity.eventDate = domain.date
        entity.status = domain.status.name
    }
}
