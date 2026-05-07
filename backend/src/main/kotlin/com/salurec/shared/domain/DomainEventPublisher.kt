package com.salurec.shared.domain

/**
 * ドメインイベント発行のインターフェース。
 * 実装は Spring の ApplicationEventPublisher ラッパー。
 */
interface DomainEventPublisher {
    fun publish(event: DomainEvent)
}
