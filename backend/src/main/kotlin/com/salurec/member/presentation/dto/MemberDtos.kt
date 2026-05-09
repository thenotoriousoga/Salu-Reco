package com.salurec.member.presentation.dto

import com.fasterxml.jackson.annotation.JsonProperty
import com.salurec.member.domain.model.SoccerExperience
import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size

/** 1件分のメンバー入力 */
data class MemberInputRequest(
    @field:NotBlank(message = "メンバー名を入力してください")
    @field:Size(max = 50)
    val name: String,

    @field:Min(value = 1, message = "年次は1以上です")
    val seniorityYear: Int,

    @field:NotNull
    val soccerExperience: SoccerExperience,

    /** 指定がないときは false 扱い(Spring Boot 4 の Jackson は Kotlin のデフォルト引数を効かせないため nullable にする) */
    @get:JsonProperty("isOrganizer")
    val isOrganizer: Boolean? = false,

    @field:Size(max = 500)
    val note: String? = "",
) {
    fun organizerFlag(): Boolean = isOrganizer ?: false
    fun noteOrEmpty(): String = note ?: ""
}

/** 一括登録リクエスト */
data class BulkRegisterMembersRequest(
    @field:Valid
    val members: List<MemberInputRequest>,
)

/** 登録結果 */
data class BulkRegisterMembersResponse(
    val memberIds: List<String>,
)

/** 更新リクエスト(管理者) */
data class UpdateMemberRequest(
    @field:NotBlank
    @field:Size(max = 50)
    val name: String,

    @field:Min(1)
    val seniorityYear: Int,

    @field:NotNull
    val soccerExperience: SoccerExperience,

    @get:JsonProperty("isOrganizer")
    val isOrganizer: Boolean? = false,

    @field:Size(max = 500)
    val note: String? = "",

    @field:Size(max = 50, message = "意気込みは50文字以内です")
    val enthusiasm: String? = null,
) {
    fun organizerFlag(): Boolean = isOrganizer ?: false
    fun noteOrEmpty(): String = note ?: ""
}

/** 意気込み更新(本人) */
data class UpdateEnthusiasmRequest(
    @field:Size(max = 50, message = "意気込みは50文字以内です")
    val enthusiasm: String,
)

/** メンバー1件レスポンス */
data class MemberResponse(
    val id: String,
    val eventId: String,
    val name: String,
    val seniorityYear: Int,
    val soccerExperience: String,
    @get:JsonProperty("isOrganizer")
    val isOrganizer: Boolean,
    val note: String,
    val enthusiasm: String,
)

/** メンバー一覧レスポンス */
data class MemberListResponse(
    val members: List<MemberResponse>,
)
