package com.salurec.event.infrastructure.service

import com.salurec.event.domain.model.JoinCode
import com.salurec.event.domain.port.EventRepository
import com.salurec.event.domain.service.JoinCodeGenerator
import org.springframework.stereotype.Component
import java.security.SecureRandom

/**
 * 参加コードを重複なく生成する実装。
 * ランダム生成し、既存イベントと重複しないものを返す。
 */
@Component
class JoinCodeGeneratorImpl(
    private val eventRepository: EventRepository,
) : JoinCodeGenerator {

    private val random = SecureRandom()

    override fun generateUnique(): JoinCode {
        repeat(MAX_RETRY) {
            val code = JoinCode(randomCode())
            if (!eventRepository.existsByJoinCode(code)) {
                return code
            }
        }
        throw IllegalStateException("参加コードの生成に失敗しました。${MAX_RETRY}回試行しましたが重複を解消できませんでした")
    }

    private fun randomCode(): String {
        val chars = JoinCode.ALLOWED_CHARS
        val length = CODE_LENGTH
        return buildString(length) {
            repeat(length) { append(chars[random.nextInt(chars.length)]) }
        }
    }

    companion object {
        private const val CODE_LENGTH = 5
        private const val MAX_RETRY = 20
    }
}
