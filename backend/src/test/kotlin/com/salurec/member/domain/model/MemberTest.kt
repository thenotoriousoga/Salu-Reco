package com.salurec.member.domain.model

import com.salurec.event.domain.model.EventId
import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import java.util.UUID

class MemberTest : DescribeSpec({

    fun newMember(name: String = "田中"): Member = Member.create(
        id = MemberId(UUID.randomUUID().toString()),
        eventId = EventId(UUID.randomUUID().toString()),
        name = MemberName(name),
        seniorityYear = 3,
        soccerExperience = SoccerExperience.Experienced,
    )

    describe("MemberName") {
        it("空文字は拒否") { shouldThrow<IllegalArgumentException> { MemberName("") } }
        it("51文字は拒否") { shouldThrow<IllegalArgumentException> { MemberName("a".repeat(51)) } }
    }

    describe("Member") {
        it("年次は1以上") {
            shouldThrow<IllegalArgumentException> {
                Member.create(
                    id = MemberId(UUID.randomUUID().toString()),
                    eventId = EventId(UUID.randomUUID().toString()),
                    name = MemberName("a"),
                    seniorityYear = 0,
                    soccerExperience = SoccerExperience.Inexperienced,
                )
            }
        }

        it("意気込みは50文字まで") {
            val m = newMember()
            val updated = m.updateEnthusiasm("a".repeat(50))
            updated.enthusiasm.length shouldBe 50
            shouldThrow<IllegalArgumentException> { m.updateEnthusiasm("a".repeat(51)) }
        }

        it("幹事フラグのトグル") {
            val m = newMember()
            m.markAsOrganizer().isOrganizer shouldBe true
            m.markAsOrganizer().unmarkAsOrganizer().isOrganizer shouldBe false
        }

        it("rename / updateExperience / updateSeniorityYear / updateNote") {
            val m = newMember("山田")
                .rename(MemberName("佐藤"))
                .updateExperience(SoccerExperience.Inexperienced)
                .updateSeniorityYear(5)
                .updateNote("初参加")
            m.name.value shouldBe "佐藤"
            m.soccerExperience shouldBe SoccerExperience.Inexperienced
            m.seniorityYear shouldBe 5
            m.note shouldBe "初参加"
        }
    }
})
