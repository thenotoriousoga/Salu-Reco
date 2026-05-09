package com.salurec.event.application.port

import com.salurec.event.domain.model.EventId

/**
 * Event 作成時に幹事を初期メンバーとして登録する Port。
 * 実装は Member コンテキストの Adapter が担う。
 */
interface MemberRegistrationPort {
    /**
     * 幹事を指定イベントにメンバー登録する。
     * @return 登録された MemberId の値(UUID 文字列)
     */
    fun registerOrganizer(eventId: EventId, name: String): String
}
