package com.salurec.event.presentation.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.salurec.shared.AbstractIntegrationTest
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
 */
@AutoConfigureMockMvc
class EventControllerIntegrationTest : AbstractIntegrationTest() {

    @Autowired
    lateinit var mockMvc: MockMvc

    // Spring Boot 4.0 でモジュール分割された影響で @SpringBootTest の自動構成に
    // ObjectMapper が含まれなくなったため、テスト側で自前構築する。
    private val objectMapper: ObjectMapper = jacksonObjectMapper().registerModule(JavaTimeModule())

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
}
