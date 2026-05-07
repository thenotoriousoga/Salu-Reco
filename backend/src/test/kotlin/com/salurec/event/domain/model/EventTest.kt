package com.salurec.event.domain.model

import io.kotest.assertions.throwables.shouldThrow
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import java.time.LocalDate
import java.util.UUID

class EventTest : DescribeSpec({

    fun newEvent(status: EventStatus = EventStatus.Preparing): Event = Event(
        id = EventId(UUID.randomUUID().toString()),
        name = EventName("テスト大会"),
        date = LocalDate.of(2026, 6, 1),
        status = status,
        joinCode = JoinCode("ABCDE"),
    )

    describe("Event.create") {
        it("準備中ステータスで生成される") {
            val event = Event.create(
                id = EventId(UUID.randomUUID().toString()),
                name = EventName("夏合宿"),
                date = LocalDate.of(2026, 7, 15),
                joinCode = JoinCode("XYZ23"),
            )
            event.status shouldBe EventStatus.Preparing
        }
    }

    describe("EventName") {
        it("空文字を拒否する") {
            shouldThrow<IllegalArgumentException> { EventName("") }
        }
        it("101文字を拒否する") {
            shouldThrow<IllegalArgumentException> { EventName("a".repeat(101)) }
        }
    }

    describe("JoinCode") {
        it("許容文字のみ受け付ける") {
            JoinCode("ABCDE").value shouldBe "ABCDE"
        }
        it("紛らわしい0を拒否する") {
            shouldThrow<IllegalArgumentException> { JoinCode("ABC0D") }
        }
        it("3文字を拒否する") {
            shouldThrow<IllegalArgumentException> { JoinCode("ABC") }
        }
        it("from は大文字化・トリムする") {
            JoinCode.from(" abcde ").value shouldBe "ABCDE"
        }
    }

    describe("start") {
        it("準備中かつメンバー2名以上なら進行中に遷移") {
            val started = newEvent().start(memberCount = 2)
            started.status shouldBe EventStatus.InProgress
        }
        it("準備中でない場合は拒否") {
            shouldThrow<IllegalStateException> {
                newEvent(status = EventStatus.InProgress).start(memberCount = 3)
            }
        }
        it("メンバー1名以下は拒否") {
            shouldThrow<IllegalArgumentException> {
                newEvent().start(memberCount = 1)
            }
        }
    }

    describe("finish") {
        it("進行中かつ進行中ラウンドなし・ラウンド1件以上なら終了に遷移") {
            val finished = newEvent(status = EventStatus.InProgress)
                .finish(roundCount = 1, hasOngoingRound = false)
            finished.status shouldBe EventStatus.Finished
        }
        it("進行中ラウンドが残っていれば拒否") {
            shouldThrow<IllegalArgumentException> {
                newEvent(status = EventStatus.InProgress)
                    .finish(roundCount = 1, hasOngoingRound = true)
            }
        }
        it("ラウンドが0件なら拒否") {
            shouldThrow<IllegalArgumentException> {
                newEvent(status = EventStatus.InProgress)
                    .finish(roundCount = 0, hasOngoingRound = false)
            }
        }
        it("進行中でない場合は拒否") {
            shouldThrow<IllegalStateException> {
                newEvent(status = EventStatus.Preparing)
                    .finish(roundCount = 1, hasOngoingRound = false)
            }
        }
    }

    describe("reopen") {
        it("終了状態のみ再開できる") {
            val reopened = newEvent(status = EventStatus.Finished).reopen()
            reopened.status shouldBe EventStatus.InProgress
        }
        it("準備中は拒否") {
            shouldThrow<IllegalStateException> { newEvent().reopen() }
        }
    }
})
