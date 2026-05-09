package com.salurec.shared

import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Testcontainers

/**
 * 統合テストの共通基盤。
 * PostgreSQL コンテナを全テストで共有(withReuse=true)する。
 * 加えてコンテナ名を固定化することで、Testcontainers 起動ごとに別コンテナを作らないようにする。
 */
@SpringBootTest
@Testcontainers
abstract class AbstractIntegrationTest {
    companion object {
        @JvmStatic
        val postgres: PostgreSQLContainer<*> = PostgreSQLContainer("postgres:16-alpine")
            .withReuse(true)
            // 再利用時に同じ Flyway スキーマを使うため、起動中の同名コンテナに接続し直す
            .withLabel("com.salurec.role", "test-postgres")

        init {
            postgres.start()
        }

        @DynamicPropertySource
        @JvmStatic
        fun props(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl)
            registry.add("spring.datasource.username", postgres::getUsername)
            registry.add("spring.datasource.password", postgres::getPassword)
        }
    }
}
