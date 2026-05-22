package com.salurec.event.infrastructure.persistence.repository

import com.salurec.event.domain.model.Event
import com.salurec.event.domain.model.EventId
import com.salurec.event.domain.model.EventName
import com.salurec.event.domain.model.EventStatus
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
 * EventRepository の統合テスト(Testcontainers + 実PostgreSQL)。
 */
@Transactional
class EventRepositoryImplTest : AbstractIntegrationTest() {

    @Autowired
    lateinit var eventRepository: EventRepository

    private fun newEvent(joinCode: String = "ABCDE"): Event = Event.create(
        id = EventId(UUID.randomUUID().toString()),
        name = EventName("結合テスト大会"),
        date = LocalDate.of(2026, 6, 1),
        joinCode = JoinCode(joinCode),
    )

    @Test
    fun `save と findById で永続化・復元できる`() {
        val event = newEvent()
        eventRepository.save(event)

        val loaded = eventRepository.findById(event.id)
        assertThat(loaded).isNotNull
        assertThat(loaded!!.name.value).isEqualTo("結合テスト大会")
        assertThat(loaded.status).isEqualTo(EventStatus.Preparing)
    }

    @Test
    fun `findByJoinCode で参加コードから取得できる`() {
        val event = newEvent(joinCode = "ZYXWV")
        eventRepository.save(event)

        val loaded = eventRepository.findByJoinCode(JoinCode("ZYXWV"))
        assertThat(loaded).isNotNull
        assertThat(loaded!!.id).isEqualTo(event.id)
    }

    @Test
    fun `existsByJoinCode は重複を検知する`() {
        eventRepository.save(newEvent(joinCode = "QRSTU"))
        assertThat(eventRepository.existsByJoinCode(JoinCode("QRSTU"))).isTrue
        assertThat(eventRepository.existsByJoinCode(JoinCode("DDDDD"))).isFalse
    }

    @Test
    fun `既存Eventの更新ができる`() {
        val event = newEvent(joinCode = "MNPQR")
        eventRepository.save(event)
        val started = event.start(memberCount = 3)
        eventRepository.save(started)

        val loaded = eventRepository.findById(event.id)
        assertThat(loaded!!.status).isEqualTo(EventStatus.InProgress)
    }
}
