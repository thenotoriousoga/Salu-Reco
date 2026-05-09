package com.salurec.member.domain.model

import com.salurec.event.domain.model.EventId

/**
 * Member 集約ルート。
 * 他集約(Event)への参照は ID のみ保持する。
 *
 * 意気込み(enthusiasm)は本人のみが更新可能(認可は Application/Presentation 層で判定)。
 */
data class Member(
    val id: MemberId,
    val eventId: EventId,
    val name: MemberName,
    val seniorityYear: Int,
    val soccerExperience: SoccerExperience,
    val isOrganizer: Boolean,
    val note: String,
    val enthusiasm: String,
) {
    init {
        require(seniorityYear >= 1) { "年次は1以上です" }
        require(enthusiasm.length <= ENTHUSIASM_MAX) { "意気込みは${ENTHUSIASM_MAX}文字以内です" }
    }

    fun rename(newName: MemberName): Member = copy(name = newName)

    fun updateExperience(exp: SoccerExperience): Member = copy(soccerExperience = exp)

    fun updateSeniorityYear(year: Int): Member {
        require(year >= 1) { "年次は1以上です" }
        return copy(seniorityYear = year)
    }

    fun markAsOrganizer(): Member = copy(isOrganizer = true)
    fun unmarkAsOrganizer(): Member = copy(isOrganizer = false)

    fun updateEnthusiasm(text: String): Member {
        require(text.length <= ENTHUSIASM_MAX) { "意気込みは${ENTHUSIASM_MAX}文字以内です" }
        return copy(enthusiasm = text)
    }

    fun updateNote(text: String): Member = copy(note = text)

    companion object {
        const val ENTHUSIASM_MAX = 50

        fun create(
            id: MemberId,
            eventId: EventId,
            name: MemberName,
            seniorityYear: Int,
            soccerExperience: SoccerExperience,
            isOrganizer: Boolean = false,
            note: String = "",
            enthusiasm: String = "",
        ): Member = Member(
            id = id,
            eventId = eventId,
            name = name,
            seniorityYear = seniorityYear,
            soccerExperience = soccerExperience,
            isOrganizer = isOrganizer,
            note = note,
            enthusiasm = enthusiasm,
        )
    }
}
