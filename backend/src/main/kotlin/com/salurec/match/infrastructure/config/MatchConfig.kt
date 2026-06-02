package com.salurec.match.infrastructure.config

import com.salurec.match.domain.service.TeamSplitService
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * Match コンテキストの Bean 定義。
 */
@Configuration
class MatchConfig {

    @Bean
    fun teamSplitService(): TeamSplitService = TeamSplitService()
}
