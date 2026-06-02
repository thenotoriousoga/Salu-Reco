package com.salurec.match.application.command

import com.salurec.match.application.dto.CreateMatchCommand
import com.salurec.match.application.dto.CreateMatchResult
import com.salurec.match.domain.event.MatchCreated
import com.salurec.match.domain.exception.InvalidMatchStateException
import com.salurec.match.domain.exception.RoundNotFoundException
import com.salurec.match.domain.model.Match
import com.salurec.match.domain.model.MatchId
import com.salurec.match.domain.model.MatchParticipant
import com.salurec.match.domain.model.RoundId
import com.salurec.match.domain.model.RoundStatus
import com.salurec.match.domain.model.TeamName
import com.salurec.match.domain.port.MatchRepository
import com.salurec.match.domain.port.RoundRepository
import com.salurec.member.domain.model.MemberId
import com.salurec.shared.domain.DomainEventPublisher
import com.salurec.shared.domain.IdGenerator
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 試合を新規作成するユースケース。
 * 親ラウンドが進行中であることを検証してから作成する。
 */
@Service
class CreateMatchUseCase(
    private val matchRepository: MatchRepository,
    private val roundRepository: RoundRepository,
    private val idGenerator: IdGenerator,
    private val eventPublisher: DomainEventPublisher,
) {
    @Transactional
    fun execute(command: CreateMatchCommand): CreateMatchResult {
        val roundId = RoundId(command.roundId)
        val round = roundRepository.findById(roundId)
            ?: throw RoundNotFoundException(command.roundId)

        // 親ラウンドが進行中であることを検証
        if (round.status != RoundStatus.InProgress) {
            throw InvalidMatchStateException("進行中のラウンドでのみ試合を作成できます")
        }

        // 参加者の変換
        val participants = command.participants.map { input ->
            MatchParticipant(
                memberId = MemberId(input.memberId),
                team = input.team,
                isSubstitute = false,
            )
        }

        // 試合番号の決定（ラウンド内連番は Infrastructure 層で実装するため、ここでは 1 を仮設定）
        // 実際の matchNumber は MatchRepository の実装で決定する
        val matchId = MatchId(idGenerator.generate())
        val match = Match.create(
            id = matchId,
            roundId = roundId,
            matchNumber = 1, // Infrastructure 層で適切に設定される
            teamAName = TeamName(command.teamAName),
            teamBName = TeamName(command.teamBName),
            participants = participants,
        )

        val saved = matchRepository.save(match)
        eventPublisher.publish(MatchCreated(matchId = saved.id, roundId = roundId))

        return CreateMatchResult(matchId = saved.id)
    }
}
