package com.salurec.event.application.command

import com.salurec.event.application.dto.CreateEventCommand
import com.salurec.event.application.port.MemberRegistrationPort
import com.salurec.event.domain.event.EventCreated
import com.salurec.event.domain.model.Event
import com.salurec.event.domain.model.EventStatus
import com.salurec.event.domain.model.JoinCode
import com.salurec.event.domain.port.EventRepository
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

            val memberRegistration = mockk<MemberRegistrationPort>(relaxed = true)
            val eventPublisher = mockk<DomainEventPublisher>(relaxed = true)

            val useCase = CreateEventUseCase(
                eventRepository = eventRepository,
                joinCodeGenerator = joinCodeGenerator,
                memberRegistration = memberRegistration,
                idGenerator = idGenerator,
                eventPublisher = eventPublisher,
            )

            val result = useCase.execute(
                CreateEventCommand(name = "テスト大会", date = LocalDate.of(2026, 6, 1)),
            )

            result.eventId.value shouldBe generatedId
            result.joinCode.value shouldBe "ABCDE"
            result.organizerMemberId shouldBe null

            savedSlot.captured.status shouldBe EventStatus.Preparing
            savedSlot.captured.name.value shouldBe "テスト大会"

            verify(exactly = 1) { eventPublisher.publish(match { it is EventCreated }) }
            verify(exactly = 0) { memberRegistration.registerOrganizer(any(), any()) }
        }

        it("organizerName 指定時は幹事メンバーを登録する") {
            val idGenerator = mockk<IdGenerator>()
            every { idGenerator.generate() } returns UUID.randomUUID().toString()

            val joinCodeGenerator = mockk<JoinCodeGenerator>()
            every { joinCodeGenerator.generateUnique() } returns JoinCode("XYZ23")

            val eventRepository = mockk<EventRepository>()
            every { eventRepository.save(any()) } answers { firstArg() }

            val memberRegistration = mockk<MemberRegistrationPort>()
            every { memberRegistration.registerOrganizer(any(), any()) } returns "organizer-member-id"

            val useCase = CreateEventUseCase(
                eventRepository = eventRepository,
                joinCodeGenerator = joinCodeGenerator,
                memberRegistration = memberRegistration,
                idGenerator = idGenerator,
                eventPublisher = mockk(relaxed = true),
            )

            val result = useCase.execute(
                CreateEventCommand(
                    name = "幹事テスト大会",
                    date = LocalDate.of(2026, 7, 1),
                    organizerName = "田中",
                ),
            )

            result.organizerMemberId shouldBe "organizer-member-id"
            verify(exactly = 1) { memberRegistration.registerOrganizer(any(), "田中") }
        }
    }
})
