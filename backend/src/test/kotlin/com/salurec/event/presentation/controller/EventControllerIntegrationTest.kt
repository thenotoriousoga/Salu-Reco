package com.salurec.event.presentation.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.salurec.shared.AbstractIntegrationTest
import com.salurec.shared.WithMockAuthPrincipal
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Event の API 結合テスト。
 * 認可は SecurityConfig で URL ベースに集約しているため、管理者として振る舞うテストは
 * @WithMockAuthPrincipal(role = ADMIN) で AuthPrincipal を注入する。
 */
@AutoConfigureMockMvc
@WithMockAuthPrincipal
class EventControllerIntegrationTest : AbstractIntegrationTest() {

    @Autowired
    lateinit var mockMvc: MockMvc

    // Spring Boot 4.0 でモジュール分割された影響で @SpringBootTest の自動構成に
    // ObjectMapper が含まれなくなったため、テスト側で自前構築する。
    private val objectMapper: ObjectMapper = jacksonObjectMapper()

    @Test
    fun `イベント作成APIが201を返し、一覧で取得できる`() {
        val body = mapOf("name" to "統合テスト大会", "date" to "2026-06-01")
        mockMvc.perform(
            post("/api/events")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.eventId").isNotEmpty)
            .andExpect(jsonPath("$.joinCode").isNotEmpty)

        mockMvc.perform(get("/api/events"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.events").isArray)
            .andExpect(jsonPath("$.events[?(@.name == '統合テスト大会')]").exists())
    }

    @Test
    fun `イベント名が空なら400を返す`() {
        val body = mapOf("name" to "", "date" to "2026-06-01")
        mockMvc.perform(
            post("/api/events")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `イベント詳細が取得できる`() {
        val body = mapOf("name" to "詳細テスト大会", "date" to "2026-07-01")
        val createRes = mockMvc.perform(
            post("/api/events")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        ).andExpect(status().isCreated).andReturn().response.contentAsString
        val eventId = objectMapper.readTree(createRes)["eventId"].asText()

        mockMvc.perform(get("/api/events/$eventId"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(eventId))
            .andExpect(jsonPath("$.name").value("詳細テスト大会"))
            .andExpect(jsonPath("$.status").value("Preparing"))
    }

    @Test
    fun `存在しないイベントIDは404を返す`() {
        mockMvc.perform(get("/api/events/00000000-0000-0000-0000-000000000000"))
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.code").value("EVENT_NOT_FOUND"))
    }

    @Test
    fun `startで進行中に遷移し、finishで終了、reopenで進行中に戻る`() {
        val body = mapOf(
            "name" to "遷移テスト大会",
            "date" to "2026-08-01",
            "organizerName" to "幹事太郎",
        )
        val createRes = mockMvc.perform(
            post("/api/events")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        ).andReturn().response.contentAsString
        val eventId = objectMapper.readTree(createRes)["eventId"].asText()

        // 2人目のメンバーを直接登録(start にはメンバー2名以上が必要)
        val memberBody = mapOf(
            "members" to listOf(
                mapOf(
                    "name" to "選手2",
                    "seniorityYear" to 1,
                    "soccerExperience" to "Inexperienced",
                ),
            ),
        )
        mockMvc.perform(
            post("/api/events/$eventId/members")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(memberBody)),
        ).andExpect(status().isCreated)

        // start: Preparing -> InProgress
        mockMvc.perform(post("/api/events/$eventId/start"))
            .andExpect(status().isNoContent)
        mockMvc.perform(get("/api/events/$eventId"))
            .andExpect(jsonPath("$.status").value("InProgress"))

        // finish: InProgress -> Finished
        mockMvc.perform(post("/api/events/$eventId/finish"))
            .andExpect(status().isNoContent)
        mockMvc.perform(get("/api/events/$eventId"))
            .andExpect(jsonPath("$.status").value("Finished"))

        // reopen: Finished -> InProgress
        mockMvc.perform(post("/api/events/$eventId/reopen"))
            .andExpect(status().isNoContent)
        mockMvc.perform(get("/api/events/$eventId"))
            .andExpect(jsonPath("$.status").value("InProgress"))
    }

    @Test
    fun `メンバー不足で start を叩くと400を返す`() {
        val body = mapOf("name" to "メンバー不足大会", "date" to "2026-10-01")
        val createRes = mockMvc.perform(
            post("/api/events")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        ).andReturn().response.contentAsString
        val eventId = objectMapper.readTree(createRes)["eventId"].asText()

        mockMvc.perform(post("/api/events/$eventId/start"))
            .andExpect(status().isBadRequest)
    }

    @Test
    fun `準備中のイベントを直接finishすると409を返す`() {
        val body = mapOf("name" to "不正遷移大会", "date" to "2026-09-01")
        val createRes = mockMvc.perform(
            post("/api/events")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        ).andReturn().response.contentAsString
        val eventId = objectMapper.readTree(createRes)["eventId"].asText()

        mockMvc.perform(post("/api/events/$eventId/finish"))
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.code").value("CONFLICT"))
    }
}
