package com.salurec.match.domain.model

/**
 * チーム分け結果の値オブジェクト。
 */
data class TeamAssignment(
    val teams: List<Team>,
) {
    init {
        require(teams.size >= 2) { "チームは2つ以上必要です" }
    }
}
