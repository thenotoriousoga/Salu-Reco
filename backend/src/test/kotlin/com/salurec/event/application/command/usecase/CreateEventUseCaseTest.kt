package com.salurec.event.application.command.usecase

import com.salurec.event.application.command.command.CreateEventCommand
import com.salurec.event.domain.event.EventCreated
import com.salurec.event.domain.model.Event
import com.salurec.event.domain.model.EventStatus
import com.salurec.event.domain.model.JoinCode
import com.salurec.event.domain.repository.EventRepository
import com.salurec.event.domain.service.JoinCodeGenerator
import com.salurec.shared.domain.DomainEventPublisher
import com.salurec.shared.domain.IdGenerator
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import java.time.LocalDate
import java.util.UUID

class CreateEventUseCaseTest : DescribeSpec({

    describe("execute") {
        it("準備中ステータスのEventを保存し、EventCreatedを発行する") {
            val idGenerator = mockk<IdGenerator>()
            val generatedId = UUID.randomUUID().toString()
            every { idGenerator.generate() } returns generatedId

            val joinCodeGenerator = mockk<JoinCodeGenerator>()
            every { joinCodeGenerator.generateUnique() } returns JoinCode("ABCDE")

            val eventRepository = mockk<EventRepository>()
            val savedSlot = slot<Event>()
            every { eventRepository.save(capture(savedSlot)) } answers { savedSlot.captured }

            val eventPublisher = mockk<DomainEventPublisher>(relaxed = true)

            val useCase = CreateEventUseCase(
                eventRepository = eventRepository,
                joinCodeGenerator = joinCodeGenerator,
                idGenerator = idGenerator,
                eventPublisher = eventPublisher,
            )

            val result = useCase.execute(
                CreateEventCommand(name = "テスト大会", date = LocalDate.of(2026, 6, 1)),
            )

            result.eventId.value shouldBe generatedId
            result.joinCode.value shouldBe "ABCDE"

            savedSlot.captured.status shouldBe EventStatus.Preparing
            savedSlot.captured.name.value shouldBe "テスト大会"

            verify(exactly = 1) { eventPublisher.publish(match { it is EventCreated }) }
        }
    }
})
