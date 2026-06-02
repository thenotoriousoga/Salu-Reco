package com.salurec.match.application.query.dto

/**
 * 試合一覧用の Read Model。
 */
data class MatchListItemDto(
    val id: String,
    val matchNumber: Int,
    val teamAName: String,
    val teamBName: String,
    val status: String,
    val scoreA: Int,
    val scoreB: Int,
)
