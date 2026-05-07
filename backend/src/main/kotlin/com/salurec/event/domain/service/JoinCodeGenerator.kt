package com.salurec.event.domain.service

import com.salurec.event.domain.model.JoinCode

/**
 * 重複しない参加コードを生成するドメインサービス。
 * 実装は Infrastructure 層で EventRepository を参照して一意性を担保する。
 */
interface JoinCodeGenerator {
    fun generateUnique(): JoinCode
}
