package com.salurec.match.application.command

import com.salurec.event.domain.model.EventId
import com.salurec.match.application.dto.CreateRoundCommand
import com.salurec.match.application.dto.CreateRoundResult
import com.salurec.match.application.port.MemberQueryPort
import com.salurec.match.domain.event.RoundCreated
import com.salurec.match.domain.model.Round
import com.salurec.match.domain.model.RoundId
import com.salurec.match.domain.port.RoundRepository
import com.salurec.match.domain.service.TeamSplitService
import com.salurec.member.domain.model.MemberId
import com.salurec.shared.domain.DomainEventPublisher
import com.salurec.shared.domain.IdGenerator
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * ラウンドを新規作成するユースケース。
 * メンバー情報を取得し、チーム分けを行い、ラウンドを永続化する。
 */
@Service
class CreateRoundUseCase(
    private val roundRepository: RoundRepository,
    private val memberQueryPort: MemberQueryPort,
    private val teamSplitService: TeamSplitService,
    private val idGenerator: IdGenerator,
    private val eventPublisher: DomainEventPublisher,
) {
    @Transactional
    fun execute(command: CreateRoundCommand): CreateRoundResult {
        val eventId = EventId(command.eventId)
        val memberIds = command.memberIds.map { MemberId(it) }

        // メンバーのサッカー経験情報を取得
        val membersForSplit = memberQueryPort.getMembersForSplit(memberIds)

        // チーム分け実行
        val teamAssignment = teamSplitService.split(
            members = membersForSplit,
            teamCount = command.teamCount,
        )

        // ラウンド番号の決定（イベント内連番）
        val roundNumber = roundRepository.countByEventId(eventId) + 1

        // ラウンド生成
        val roundId = RoundId(idGenerator.generate())
        val round = Round.create(
            id = roundId,
            eventId = eventId,
            roundNumber = roundNumber,
            teamAssignment = teamAssignment,
        )

        roundRepository.save(round)
        eventPublisher.publish(RoundCreated(roundId = roundId, eventId = eventId))

        return CreateRoundResult(roundId = roundId)
    }
}
