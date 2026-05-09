package com.salurec.member.infrastructure.persistence.repository

import com.salurec.event.domain.model.EventId
import com.salurec.member.domain.model.Member
import com.salurec.member.domain.model.MemberId
import com.salurec.member.domain.repository.MemberRepository
import com.salurec.member.infrastructure.persistence.mapper.MemberEntityMapper
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
class MemberRepositoryImpl(
    private val jpaRepository: MemberJpaRepository,
) : MemberRepository {

    override fun save(member: Member): Member {
        val uuid = UUID.fromString(member.id.value)
        val existing = jpaRepository.findById(uuid).orElse(null)
        val entity = if (existing != null) {
            MemberEntityMapper.applyDomain(existing, member)
            existing
        } else {
            MemberEntityMapper.toEntity(member)
        }
        return MemberEntityMapper.toDomain(jpaRepository.save(entity))
    }

    override fun saveAll(members: List<Member>): List<Member> =
        members.map { save(it) }

    override fun findById(id: MemberId): Member? =
        jpaRepository.findById(UUID.fromString(id.value))
            .map(MemberEntityMapper::toDomain)
            .orElse(null)

    override fun findByEventId(eventId: EventId): List<Member> =
        jpaRepository.findByEventIdOrderByCreatedAtAsc(UUID.fromString(eventId.value))
            .map(MemberEntityMapper::toDomain)

    override fun countByEventId(eventId: EventId): Int =
        jpaRepository.countByEventId(UUID.fromString(eventId.value))

    override fun delete(id: MemberId) {
        jpaRepository.deleteById(UUID.fromString(id.value))
    }
}
