package com.salurec.shared.domain

import java.time.Instant

/**
 * 現在時刻取得のインターフェース。
 * テスト容易性のためにドメイン層から差し替え可能にする。
 */
interface Clock {
    fun now(): Instant
}
