package com.salurec.member.application.dto

import com.salurec.member.domain.model.SoccerExperience

/** メンバー登録の1件分(一括登録にも使える) */
data class RegisterMemberInput(
    val name: String,
    val seniorityYear: Int,
    val soccerExperience: SoccerExperience,
    val isOrganizer: Boolean = false,
    val note: String = "",
)

/** 指定イベントへの一括メンバー登録コマンド */
data class BulkRegisterMembersCommand(
    val eventId: String,
    val members: List<RegisterMemberInput>,
)

/** メンバー更新(管理者) */
data class UpdateMemberCommand(
    val memberId: String,
    val name: String,
    val seniorityYear: Int,
    val soccerExperience: SoccerExperience,
    val isOrganizer: Boolean,
    val note: String,
    /** 意気込み。null のときは更新しない */
    val enthusiasm: String? = null,
)

/** 本人による意気込み更新 */
data class UpdateEnthusiasmCommand(
    val memberId: String,
    val enthusiasm: String,
)
