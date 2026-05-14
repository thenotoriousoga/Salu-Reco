# テスト戦略

## テストピラミッド

```
        ╱╲
       ╱ E2E ╲          少数: Playwright (frontend 側)
      ╱────────╲
     ╱ Integration ╲    中程度: Testcontainers + 実 DB
    ╱────────────────╲
   ╱   Unit Tests     ╲  多数: 純粋関数テスト + MockK
  ╱─────────────────────╲
```

---

## 層別テスト方針

| 層 | テスト種別 | ツール | 目的 |
|---|---|---|---|
| Domain | 単体テスト | JUnit 5 + Kotest assertions | ビジネスロジックの正しさ |
| Application (Command) | 単体テスト | JUnit 5 + MockK | UseCase のオーケストレーション |
| Application (Query) | 結合テスト | Testcontainers | JPQL 射影の正しさ |
| Infrastructure (Persistence) | 結合テスト | Testcontainers + SQL ログ検証 | N+1 検出、マッピング正確性 |
| Presentation | API 結合テスト | `@SpringBootTest` + MockMvc | HTTP ステータス、レスポンス形式 |
| Architecture | 静的解析 | ArchUnit | 依存ルール違反の検出 |

---

## Domain 層のテスト

フレームワーク不要。純粋な Kotlin テスト。

```kotlin
class EventTest {

    @Test
    fun `準備中のイベントを開始できる`() {
        val event = createPreparingEvent()

        val started = event.start(memberCount = 3)

        started.status shouldBe EventStatus.InProgress
    }

    @Test
    fun `メンバー2名未満では開始できない`() {
        val event = createPreparingEvent()

        shouldThrow<IllegalArgumentException> {
            event.start(memberCount = 1)
        }.message shouldContain "2名以上"
    }

    @Test
    fun `進行中のイベントは開始できない`() {
        val event = createInProgressEvent()

        shouldThrow<IllegalStateException> {
            event.start(memberCount = 5)
        }
    }
}
```

---

## Application 層のテスト

UseCase の依存を MockK でモック化。

```kotlin
class CreateEventUseCaseTest {

    private val eventRepository = mockk<EventRepository>()
    private val joinCodeGenerator = mockk<JoinCodeGenerator>()
    private val idGenerator = mockk<IdGenerator>()
    private val eventPublisher = mockk<DomainEventPublisher>(relaxed = true)

    private val useCase = CreateEventUseCase(
        eventRepository = eventRepository,
        joinCodeGenerator = joinCodeGenerator,
        idGenerator = idGenerator,
        eventPublisher = eventPublisher,
    )

    @Test
    fun `イベントを作成して保存する`() {
        every { idGenerator.generate() } returns "test-uuid"
        every { joinCodeGenerator.generateUnique() } returns JoinCode.from("ABCD")
        every { eventRepository.save(any()) } answers { firstArg() }

        val command = CreateEventCommand(
            name = "テストイベント",
            date = LocalDate.of(2025, 6, 1),
            organizerName = "太郎",
        )

        val result = useCase.execute(command)

        result.eventId.value shouldBe "test-uuid"
        result.joinCode.value shouldBe "ABCD"
        verify { eventRepository.save(any()) }
        verify { eventPublisher.publish(any<EventCreated>()) }
    }
}
```

---

## Infrastructure 層のテスト（Testcontainers）

### 共通基盤

```kotlin
abstract class AbstractIntegrationTest {
    companion object {
        @Container
        @JvmStatic
        val postgres = PostgreSQLContainer("postgres:16-alpine")
            .apply { start() }

        @DynamicPropertySource
        @JvmStatic
        fun props(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl)
            registry.add("spring.datasource.username", postgres::getUsername)
            registry.add("spring.datasource.password", postgres::getPassword)
        }
    }
}
```

### N+1 検出

```kotlin
@DataJpaTest
class RoundRepositoryImplTest : AbstractIntegrationTest() {

    @Test
    fun `Round取得時に追加クエリが想定本数に収まること`() {
        // Arrange: テストデータ投入
        // ...

        val queryCount = queryCountInterceptor.getCount()

        // Round + Matches + Participants で最大3本
        queryCount shouldBeLessThanOrEqualTo 3
    }
}
```

---

## アーキテクチャ境界テスト（ArchUnit）

依存ルールを CI で自動検証する。

```kotlin
class LayerDependencyTest {
    private val classes = ClassFileImporter().importPackages("com.salurec")

    @Test
    fun `Domain層はフレームワークに依存しない`() {
        noClasses().that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "org.springframework..",
                "jakarta.persistence..",
                "org.hibernate..",
            )
            .check(classes)
    }

    @Test
    fun `Domain層はApplication・Infrastructure・Presentationに依存しない`() {
        noClasses().that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "..application..",
                "..infrastructure..",
                "..presentation..",
            )
            .check(classes)
    }

    @Test
    fun `Application層はInfrastructure・Presentationに依存しない`() {
        noClasses().that().resideInAPackage("..application..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "..infrastructure..",
                "..presentation..",
            )
            .check(classes)
    }

    @Test
    fun `JPA Entityはinfrastructure内にのみ存在する`() {
        classes().that().areAnnotatedWith(jakarta.persistence.Entity::class.java)
            .should().resideInAPackage("..infrastructure.persistence.entity..")
            .check(classes)
    }

    @Test
    fun `Command UseCaseはQueryパッケージに依存しない`() {
        noClasses().that().resideInAPackage("..application.command..")
            .should().dependOnClassesThat().resideInAPackage("..application.query..")
            .check(classes)
    }

    @Test
    fun `Query ServiceはCommandパッケージに依存しない`() {
        noClasses().that().resideInAPackage("..application.query..")
            .should().dependOnClassesThat().resideInAPackage("..application.command..")
            .check(classes)
    }
}
```

---

## テスト実行設定

`build.gradle.kts`:

```kotlin
tasks.withType<Test> {
    useJUnitPlatform()
    environment("TESTCONTAINERS_RYUK_DISABLED", "true")
    systemProperty("testcontainers.reuse.enable", "true")
    maxParallelForks = (Runtime.getRuntime().availableProcessors() / 2).coerceAtLeast(1)
    jvmArgs("-XX:+UseParallelGC", "-XX:TieredStopAtLevel=1", "-noverify")
}
```
