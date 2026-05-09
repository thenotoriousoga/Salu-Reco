package com.salurec.member.domain.repository

import com.salurec.event.domain.model.EventId
import com.salurec.member.domain.model.Member
import com.salurec.member.domain.model.MemberId

/**
 * Write 側の Member リポジトリ。
 * Read 向け検索は MemberQueryService を使う。
 */
interface MemberRepository {
    fun save(member: Member): Member
    fun saveAll(members: List<Member>): List<Member>
    fun findById(id: MemberId): Member?
    fun findByEventId(eventId: EventId): List<Member>
    fun countByEventId(eventId: EventId): Int
    fun delete(id: MemberId)
}
