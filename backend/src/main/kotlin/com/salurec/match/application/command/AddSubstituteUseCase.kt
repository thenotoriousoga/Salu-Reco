package com.salurec.match.application.command

import com.salurec.match.application.dto.AddSubstituteCommand
import com.salurec.match.domain.exception.MatchNotFoundException
import com.salurec.match.domain.model.MatchId
import com.salurec.match.domain.port.MatchRepository
import com.salurec.member.domain.model.MemberId
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 助っ人を追加するユースケース。
 */
@Service
class AddSubstituteUseCase(
    private val matchRepository: MatchRepository,
) {
    @Transactional
    fun execute(command: AddSubstituteCommand) {
        val matchId = MatchId(command.matchId)
        val match = matchRepository.findById(matchId)
            ?: throw MatchNotFoundException(command.matchId)

        val updated = match.addSubstitute(
            memberId = MemberId(command.memberId),
            team = command.team,
        )

        matchRepository.save(updated)
    }
}
