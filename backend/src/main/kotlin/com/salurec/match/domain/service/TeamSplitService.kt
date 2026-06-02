package com.salurec.match.domain.service

import com.salurec.match.domain.model.MemberForSplit
import com.salurec.match.domain.model.Team
import com.salurec.match.domain.model.TeamAssignment
import com.salurec.match.domain.model.TeamName
import com.salurec.member.domain.model.MemberId
import com.salurec.member.domain.model.SoccerExperience
import kotlin.random.Random

/**
 * チーム分けドメインサービス。
 *
 * Fisher-Yates シャッフル + ラウンドロビン配分で、
 * 経験者と未経験者を均等にチームへ振り分ける。
 */
class TeamSplitService(
    private val random: Random = Random.Default,
) {
    /**
     * メンバーをチームに分割する。
     *
     * @param members チーム分け対象のメンバーリスト
     * @param teamCount チーム数（2〜人数÷3）
     * @param existingTeams 既存チーム（再分割時に使用、通常は null）
     * @return チーム分け結果
     */
    fun split(
        members: List<MemberForSplit>,
        teamCount: Int,
        existingTeams: List<Team>? = null,
    ): TeamAssignment {
        require(members.size >= 4) { "チーム分けには最低4人必要です" }
        require(teamCount >= 2) { "チーム数は2以上必要です" }
        require(teamCount <= members.size / 3) { "チーム数が多すぎます（1チーム最低3人）" }

        // 経験者と未経験者に分離
        val experienced = members
            .filter { it.soccerExperience == SoccerExperience.Experienced }
            .toMutableList()
        val inexperienced = members
            .filter { it.soccerExperience == SoccerExperience.Inexperienced }
            .toMutableList()

        // Fisher-Yates シャッフル
        shuffle(experienced)
        shuffle(inexperienced)

        // チームの初期化
        val teamMembers: List<MutableList<MemberId>> = if (existingTeams != null) {
            existingTeams.map { it.memberIds.toMutableList() }
        } else {
            List(teamCount) { mutableListOf() }
        }

        // ラウンドロビン配分（経験者を先に配分）
        var index = 0
        for (member in experienced) {
            teamMembers[index % teamCount].add(member.memberId)
            index++
        }
        for (member in inexperienced) {
            teamMembers[index % teamCount].add(member.memberId)
            index++
        }

        // チーム名の生成とキャプテン選出
        val teams = teamMembers.mapIndexed { i, memberIds ->
            val name = if (existingTeams != null && i < existingTeams.size) {
                existingTeams[i].name
            } else {
                TeamName("チーム${i + 1}")
            }
            val captainId = memberIds[random.nextInt(memberIds.size)]
            Team(name = name, memberIds = memberIds.toList(), captainId = captainId)
        }

        return TeamAssignment(teams = teams)
    }

    /**
     * Fisher-Yates シャッフルアルゴリズム。
     */
    private fun <T> shuffle(list: MutableList<T>) {
        for (i in list.size - 1 downTo 1) {
            val j = random.nextInt(i + 1)
            val temp = list[i]
            list[i] = list[j]
            list[j] = temp
        }
    }
}
