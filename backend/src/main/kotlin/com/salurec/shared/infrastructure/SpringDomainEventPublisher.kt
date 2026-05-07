package com.salurec.shared.infrastructure

import com.salurec.shared.domain.DomainEvent
import com.salurec.shared.domain.DomainEventPublisher
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Component

/**
 * Spring の ApplicationEventPublisher をドメインイベント発行の実装として使う。
 */
@Component
class SpringDomainEventPublisher(
    private val applicationEventPublisher: ApplicationEventPublisher,
) : DomainEventPublisher {
    override fun publish(event: DomainEvent) {
        applicationEventPublisher.publishEvent(event)
    }
}
