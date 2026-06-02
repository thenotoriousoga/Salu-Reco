package com.salurec.match.application.command

import com.salurec.match.application.dto.RecordGoalCommand
import com.salurec.match.domain.event.GoalRecorded
import com.salurec.match.domain.exception.MatchNotFoundException
import com.salurec.match.domain.model.Goal
import com.salurec.match.domain.model.GoalId
import com.salurec.match.domain.model.MatchId
import com.salurec.match.domain.port.MatchRepository
import com.salurec.member.domain.model.MemberId
import com.salurec.shared.domain.DomainEventPublisher
import com.salurec.shared.domain.IdGenerator
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 得点を記録するユースケース。
 */
@Service
class RecordGoalUseCase(
    private val matchRepository: MatchRepository,
    private val idGenerator: IdGenerator,
    private val eventPublisher: DomainEventPublisher,
) {
    @Transactional
    fun execute(command: RecordGoalCommand): String {
        val matchId = MatchId(command.matchId)
        val match = matchRepository.findById(matchId)
            ?: throw MatchNotFoundException(command.matchId)

        val goalId = GoalId(idGenerator.generate())
        val goal = Goal(
            id = goalId,
            team = command.team,
            scorerId = command.scorerId?.let { MemberId(it) },
            type = command.type,
        )

        val updated = match.recordGoal(goal)

        matchRepository.save(updated)
        eventPublisher.publish(GoalRecorded(matchId = matchId, goalId = goalId))

        return goalId.value
    }
}
