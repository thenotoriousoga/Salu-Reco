package com.salurec.event.domain.model

/**
 * イベントのステータス。
 * 準備中 → 進行中 ⇄ イベント終了 の遷移のみ許可。
 */
enum class EventStatus {
    Preparing,
    InProgress,
    Finished,
}
