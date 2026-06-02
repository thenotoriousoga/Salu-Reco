package com.salurec.match.application.command

import com.salurec.match.domain.exception.MatchNotFoundException
import com.salurec.match.domain.model.GoalId
import com.salurec.match.domain.model.MatchId
import com.salurec.match.domain.port.MatchRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 得点を削除するユースケース。
 */
@Service
class RemoveGoalUseCase(
    private val matchRepository: MatchRepository,
) {
    @Transactional
    fun execute(matchId: String, goalId: String) {
        val id = MatchId(matchId)
        val match = matchRepository.findById(id)
            ?: throw MatchNotFoundException(matchId)

        val updated = match.removeGoal(GoalId(goalId))

        matchRepository.save(updated)
    }
}
