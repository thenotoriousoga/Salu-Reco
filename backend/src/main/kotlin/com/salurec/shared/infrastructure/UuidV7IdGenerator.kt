package com.salurec.shared.infrastructure

import com.github.f4b6a3.uuid.UuidCreator
import com.salurec.shared.domain.IdGenerator
import org.springframework.stereotype.Component

/**
 * UUID v7(時系列順)でID文字列を生成する。
 * B-Treeインデックスの断片化を抑えるために採用(ADR-003)。
 */
@Component
class UuidV7IdGenerator : IdGenerator {
    override fun generate(): String = UuidCreator.getTimeOrderedEpoch().toString()
}
