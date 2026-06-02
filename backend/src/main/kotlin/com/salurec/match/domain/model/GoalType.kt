package com.salurec.match.domain.model

/**
 * ゴールの種類。
 */
enum class GoalType {
    /** 通常ゴール（得点者必須） */
    Normal,

    /** オウンゴール（得点者は null） */
    OwnGoal,

    /** 不明（得点者は null） */
    Unknown,
}
