package com.salurec.shared.infrastructure

import com.salurec.shared.domain.Clock
import org.springframework.stereotype.Component
import java.time.Instant

/**
 * システム時刻を返す標準実装。
 */
@Component
class SystemClock : Clock {
    override fun now(): Instant = Instant.now()
}
