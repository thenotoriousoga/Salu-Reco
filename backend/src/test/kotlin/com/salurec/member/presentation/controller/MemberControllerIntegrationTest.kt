package com.salurec.member.presentation.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.salurec.shared.AbstractIntegrationTest
import com.salurec.shared.WithMockAuthPrincipal
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

/**
 * Member API 結合テスト。ADMIN で動作確認。
 */
@AutoConfigureMockMvc
@WithMockAuthPrincipal
class MemberControllerIntegrationTest : AbstractIntegrationTest() {

    @Autowired
    lateinit var mockMvc: MockMvc

    private val objectMapper: ObjectMapper =
        jacksonObjectMapper()

    private fun createEvent(name: String = "メンバーテスト大会"): String {
        val body = mapOf("name" to name, "date" to "2026-06-01")
        val createRes = mockMvc.perform(
            post("/api/events")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        ).andReturn().response.contentAsString
        return objectMapper.readTree(createRes)["eventId"].asText()
    }

    @Test
    fun `一括登録と一覧取得ができる`() {
        val eventId = createEvent()
        val body = mapOf(
            "members" to listOf(
                mapOf("name" to "山田", "seniorityYear" to 1, "soccerExperience" to "Experienced"),
                mapOf("name" to "佐藤", "seniorityYear" to 3, "soccerExperience" to "Inexperienced", "isOrganizer" to true),
            ),
        )

        mockMvc.perform(
            post("/api/events/$eventId/members")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        ).andExpect(status().isCreated)
            .andExpect(jsonPath("$.memberIds.length()").value(2))

        mockMvc.perform(get("/api/events/$eventId/members"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.members.length()").value(2))
            .andExpect(jsonPath("$.members[?(@.name == '山田')]").exists())
            .andExpect(jsonPath("$.members[?(@.name == '佐藤' && @.isOrganizer == true)]").exists())
    }

    @Test
    fun `メンバー更新・削除が動く`() {
        val eventId = createEvent()
        val body = mapOf(
            "members" to listOf(
                mapOf("name" to "田中", "seniorityYear" to 2, "soccerExperience" to "Inexperienced"),
            ),
        )
        val res = mockMvc.perform(
            post("/api/events/$eventId/members")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        ).andReturn().response.contentAsString
        val memberId = objectMapper.readTree(res)["memberIds"][0].asText()

        val updateBody = mapOf(
            "name" to "田中太郎",
            "seniorityYear" to 5,
            "soccerExperience" to "Experienced",
            "isOrganizer" to true,
            "note" to "昇格",
        )
        mockMvc.perform(
            put("/api/events/$eventId/members/$memberId")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateBody)),
        ).andExpect(status().isNoContent)

        mockMvc.perform(get("/api/events/$eventId/members"))
            .andExpect(jsonPath("$.members[0].name").value("田中太郎"))
            .andExpect(jsonPath("$.members[0].seniorityYear").value(5))
            .andExpect(jsonPath("$.members[0].isOrganizer").value(true))

        mockMvc.perform(delete("/api/events/$eventId/members/$memberId"))
            .andExpect(status().isNoContent)

        mockMvc.perform(get("/api/events/$eventId/members"))
            .andExpect(jsonPath("$.members.length()").value(0))
    }

    @Test
    fun `意気込み更新API`() {
        val eventId = createEvent()
        val body = mapOf(
            "members" to listOf(
                mapOf("name" to "ABC", "seniorityYear" to 1, "soccerExperience" to "Experienced"),
            ),
        )
        val res = mockMvc.perform(
            post("/api/events/$eventId/members")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        ).andReturn().response.contentAsString
        val memberId = objectMapper.readTree(res)["memberIds"][0].asText()

        mockMvc.perform(
            put("/api/events/$eventId/members/$memberId/enthusiasm")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(mapOf("enthusiasm" to "がんばる"))),
        ).andExpect(status().isNoContent)

        mockMvc.perform(get("/api/events/$eventId/members"))
            .andExpect(jsonPath("$.members[0].enthusiasm").value("がんばる"))
    }

    @Test
    fun `存在しないメンバーの更新は404を返す`() {
        val body = mapOf(
            "name" to "dummy",
            "seniorityYear" to 1,
            "soccerExperience" to "Experienced",
            "isOrganizer" to false,
        )
        mockMvc.perform(
            put("/api/events/00000000-0000-0000-0000-000000000000/members/11111111-1111-1111-1111-111111111111")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        ).andExpect(status().isNotFound)
            .andExpect(jsonPath("$.code").value("MEMBER_NOT_FOUND"))
    }
}
