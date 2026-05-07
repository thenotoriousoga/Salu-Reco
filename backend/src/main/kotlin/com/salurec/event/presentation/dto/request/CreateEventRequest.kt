package com.salurec.event.presentation.dto.request

import com.fasterxml.jackson.annotation.JsonFormat
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.LocalDate

/**
 * イベント作成リクエスト。
 *
 * Phase 1 時点では幹事メンバー登録は含めない(Phase 4 で追加)。
 */
data class CreateEventRequest(
    @field:NotBlank(message = "イベント名を入力してください")
    @field:Size(max = 100, message = "イベント名は100文字以内です")
    val name: String,

    @field:NotNull(message = "開催日を入力してください")
    @field:JsonFormat(pattern = "yyyy-MM-dd")
    val date: LocalDate?,
)
