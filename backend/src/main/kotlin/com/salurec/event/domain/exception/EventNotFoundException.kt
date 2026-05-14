package com.salurec.event.domain.exception

import com.salurec.shared.domain.DomainException

/**
 * 指定されたイベントが見つからない場合の例外。
 */
class EventNotFoundException(eventId: String) :
    DomainException("イベントが見つかりません: eventId=$eventId")
