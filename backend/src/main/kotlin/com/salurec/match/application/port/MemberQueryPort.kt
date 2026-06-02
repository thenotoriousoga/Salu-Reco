package com.salurec.match.application.port

import com.salurec.match.domain.model.MemberForSplit
import com.salurec.member.domain.model.MemberId

/**
 * Member コンテキストからメンバー情報を取得するポート。
 * チーム分け時にメンバーのサッカー経験情報を取得するために使用する。
 */
interface MemberQueryPort {
    /**
     * 指定されたメンバーIDリストに対応するチーム分け用情報を取得する。
     */
    fun getMembersForSplit(memberIds: List<MemberId>): List<MemberForSplit>
}
