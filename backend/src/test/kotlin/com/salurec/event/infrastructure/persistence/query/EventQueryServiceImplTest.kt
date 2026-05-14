package com.salurec.event.infrastructure.persistence.query

import com.salurec.event.application.query.service.EventQueryService
import com.salurec.event.domain.model.Event
import com.salurec.event.domain.model.EventId
import com.salurec.event.domain.model.EventName
import com.salurec.event.domain.model.JoinCode
import com.salurec.event.domain.port.EventRepository
import com.salurec.shared.AbstractIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.util.UUID

/**
 * EventQueryService の統合テスト。
 */
@Transactional
class EventQueryServiceImplTest : AbstractIntegrationTest() {

    @Autowired
    lateinit var eventRepository: EventRepository

    @Autowired
    lateinit var eventQueryService: EventQueryService

    @Test
    fun `list は日付降順で返す`() {
        eventRepository.save(
            Event.create(
                id = EventId(UUID.randomUUID().toString()),
                name = EventName("旧大会"),
                date = LocalDate.of(2026, 1, 1),
                joinCode = JoinCode("AAAAA"),
            ),
        )
        eventRepository.save(
            Event.create(
                id = EventId(UUID.randomUUID().toString()),
                name = EventName("新大会"),
                date = LocalDate.of(2026, 12, 1),
                joinCode = JoinCode("BBBBB"),
            ),
        )

        val items = eventQueryService.list()
        val names = items.map { it.name }
        val newIdx = names.indexOf("新大会")
        val oldIdx = names.indexOf("旧大会")
        assertThat(newIdx).isGreaterThanOrEqualTo(0)
        assertThat(oldIdx).isGreaterThanOrEqualTo(0)
        assertThat(newIdx).isLessThan(oldIdx)
    }
}
