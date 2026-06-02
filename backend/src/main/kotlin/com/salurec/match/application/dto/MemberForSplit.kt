package com.salurec.match.application.dto

/**
 * チーム分け用の軽量DTO。
 * 実体は Domain 層 (com.salurec.match.domain.model.MemberForSplit) に定義されている。
 * Application 層からの利便性のため型エイリアスを提供する。
 */
typealias MemberForSplit = com.salurec.match.domain.model.MemberForSplit
