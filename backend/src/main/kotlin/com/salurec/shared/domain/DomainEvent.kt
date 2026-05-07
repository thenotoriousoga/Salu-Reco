package com.salurec.shared.domain

import java.time.Instant

/**
 * ドメインイベントの基底インターフェース。
 * 実装クラスはユースケースの実行結果として発行される。
 */
interface DomainEvent {
    val occurredAt: Instant
}
