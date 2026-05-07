package com.salurec.identity.presentation.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.salurec.event.domain.model.Event
import com.salurec.event.domain.model.EventId
import com.salurec.event.domain.model.EventName
import com.salurec.event.domain.model.JoinCode
import com.salurec.event.domain.repository.EventRepository
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
import java.time.LocalDate
import java.util.UUID

/**
 * 認証 API の結合テスト。
 * SecurityConfig の URL ベース認可も含めて、実エンドポイントに対して検証する。
 */
@AutoConfigureMockMvc
class AuthControllerIntegrationTest : AbstractIntegrationTest() {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var eventRepository: EventRepository

    private val objectMapper: ObjectMapper =
        jacksonObjectMapper().registerModule(JavaTimeModule())

    @Test
    fun `未認証で api events を叩くと 401 を返す`() {
        mockMvc.perform(get("/api/events"))
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.code").value("UNAUTHENTICATED"))
    }

    @Test
    fun `管理者パスワードでログインすると ADMIN トークンが返り、Event API にアクセスできる`() {
        val body = mapOf("password" to "changeme")
        val response = mockMvc.perform(
            post("/api/auth/login-admin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.token").isNotEmpty)
            .andExpect(jsonPath("$.role").value("ADMIN"))
            .andReturn().response.contentAsString

        val token = objectMapper.readTree(response)["token"].asText()

        mockMvc.perform(
            get("/api/events").header("Authorization", "Bearer $token"),
        ).andExpect(status().isOk)
    }

    @Test
    fun `不正なパスワードは 401 を返す`() {
        val body = mapOf("password" to "wrong")
        mockMvc.perform(
            post("/api/auth/login-admin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        )
            .andExpect(status().isUnauthorized)
            .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
    }

    @Test
    fun `参加コードログインすると USER トークンが返る`() {
        // 事前にイベントを1件作る
        val event = Event.create(
            id = EventId(UUID.randomUUID().toString()),
            name = EventName("参加コードテスト"),
            date = LocalDate.of(2026, 6, 1),
            joinCode = JoinCode("TESTC"),
        )
        eventRepository.save(event)

        val body = mapOf("joinCode" to "TESTC")
        mockMvc.perform(
            post("/api/auth/login-with-code")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.role").value("USER"))
            .andExpect(jsonPath("$.eventId").value(event.id.value))
    }

    @Test
    fun `存在しない参加コードは 401 を返す`() {
        val body = mapOf("joinCode" to "ZZZZZ")
        mockMvc.perform(
            post("/api/auth/login-with-code")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        ).andExpect(status().isUnauthorized)
    }

    @Test
    fun `USER トークンでは管理者限定の POST api events を叩けず 403 を返す`() {
        // USER トークンを取得
        val event = Event.create(
            id = EventId(UUID.randomUUID().toString()),
            name = EventName("403テスト"),
            date = LocalDate.of(2026, 6, 1),
            joinCode = JoinCode("FRBDN"),
        )
        eventRepository.save(event)

        val loginResponse = mockMvc.perform(
            post("/api/auth/login-with-code")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(mapOf("joinCode" to "FRBDN"))),
        ).andReturn().response.contentAsString
        val userToken = objectMapper.readTree(loginResponse)["token"].asText()

        val body = mapOf("name" to "勝手に作ったイベント", "date" to "2026-06-01")
        mockMvc.perform(
            post("/api/events")
                .header("Authorization", "Bearer $userToken")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)),
        ).andExpect(status().isForbidden)
    }
}
