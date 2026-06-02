package com.salurec.match.domain.model

import com.salurec.member.domain.model.MemberId

/**
 * チームの値オブジェクト。チーム名、メンバーリスト、キャプテンを保持する。
 */
data class Team(
    val name: TeamName,
    val memberIds: List<MemberId>,
    val captainId: MemberId?,
) {
    init {
        require(memberIds.size >= 3) { "各チームは3名以上必要です" }
        captainId?.let {
            require(it in memberIds) { "キャプテンはチームメンバーに含まれている必要があります" }
        }
    }
}
