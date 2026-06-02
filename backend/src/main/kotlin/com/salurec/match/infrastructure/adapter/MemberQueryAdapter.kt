package com.salurec.match.infrastructure.adapter

import com.salurec.match.application.port.MemberQueryPort
import com.salurec.match.domain.model.MemberForSplit
import com.salurec.member.domain.model.MemberId
import com.salurec.member.domain.model.SoccerExperience
import com.salurec.member.infrastructure.persistence.repository.MemberJpaRepository
import org.springframework.stereotype.Component
import java.util.UUID

/**
 * MemberQueryPort の実装。
 * Member コンテキストの JPA リポジトリを使ってメンバー情報を取得する。
 */
@Component
class MemberQueryAdapter(
    private val memberJpaRepository: MemberJpaRepository,
) : MemberQueryPort {

    override fun getMembersForSplit(memberIds: List<MemberId>): List<MemberForSplit> {
        val uuids = memberIds.map { UUID.fromString(it.value) }
        val entities = memberJpaRepository.findAllById(uuids)
        return entities.map { entity ->
            MemberForSplit(
                memberId = MemberId(entity.id.toString()),
                soccerExperience = SoccerExperience.valueOf(entity.soccerExperience),
            )
        }
    }
}
