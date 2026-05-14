# 横断的関心事

## 認証・認可

### 認証フロー

```
[クライアント]                            [サーバー]
POST /api/auth/login-admin
  { password: "xxx" }          →    管理者パスワードと比較
                               ←    { token: "JWT...", role: "ADMIN" }

POST /api/auth/login-with-code
  { code: "ABCD" }             →    Event を join_code で検索
                               ←    { token: "JWT...", role: "USER", eventId }

GET /api/events/:id
  Authorization: Bearer JWT    →    JWT 検証 → SecurityContext にロール設定
                               ←    レスポンス
```

### JWT ペイロード

```json
{
  "sub": "admin" | "user:{joinCode}",
  "role": "ADMIN" | "USER",
  "eventId": "xxx",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### 認可の実装方針

| レベル | 方法 | 例 |
|---|---|---|
| エンドポイント単位 | `SecurityConfig` の `SecurityFilterChain` で URL パターン + HTTP メソッドで定義 | `/api/auth/**` は認証不要、`POST /api/events` は ADMIN のみ |
| ロール単位 | `SecurityConfig` に集約（`@PreAuthorize` は使わない） | 管理者のみイベント作成可能 |
| リソース単位（動的） | Controller 内で `AuthPrincipal.canAccessEvent(eventId)` を検証 | USER は自分の eventId のみアクセス可 |

**設計判断**: `@PreAuthorize` を Controller に撒くと Presentation 層がフレームワーク依存してノイズになる。URL ベースで `SecurityConfig` に集約し、動的認可のみ Controller 内で行う。

### Identity & Access コンテキストの配置

```
com.salurec.identity
├── domain/
│   ├── Role.kt                    enum: ADMIN, USER
│   └── AuthPrincipal.kt          認証済みユーザーの情報
├── application/
│   ├── LoginAsAdminUseCase.kt
│   └── LoginWithCodeUseCase.kt
├── infrastructure/
│   ├── JwtTokenProvider.kt        JWT 生成・検証
│   ├── JwtAuthenticationFilter.kt リクエストごとの JWT 検証フィルタ
│   └── SecurityConfig.kt         SecurityFilterChain 定義
└── presentation/
    └── AuthController.kt
```

---

## 例外ハンドリング

### 例外の階層

```
DomainException (abstract)
├── NotFoundException          → 404
├── InvalidStateException      → 409
├── ValidationException        → 400
└── AccessDeniedException      → 403
```

### GlobalExceptionHandler

```kotlin
@ControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(DomainException::class)
    fun handleDomain(ex: DomainException): ResponseEntity<ApiErrorResponse> {
        val status = resolveStatus(ex)
        return ResponseEntity.status(status).body(
            ApiErrorResponse(error = ex.errorCode, message = ex.message ?: "")
        )
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(ex: MethodArgumentNotValidException): ResponseEntity<ApiErrorResponse> {
        val message = ex.bindingResult.fieldErrors
            .joinToString(", ") { "${it.field}: ${it.defaultMessage}" }
        return ResponseEntity.badRequest().body(
            ApiErrorResponse(error = "VALIDATION_ERROR", message = message)
        )
    }

    private fun resolveStatus(ex: DomainException): HttpStatus = when (ex) {
        is NotFoundException -> HttpStatus.NOT_FOUND
        is InvalidStateException -> HttpStatus.CONFLICT
        is AccessDeniedException -> HttpStatus.FORBIDDEN
        else -> HttpStatus.BAD_REQUEST
    }
}
```

### 統一エラーレスポンス形式

```json
{
  "error": "EventNotFoundException",
  "message": "イベントが見つかりません: abc123"
}
```

---

## ドメインイベント

### 発行メカニズム

初期実装では Spring の `ApplicationEventPublisher` を使ったインプロセス同期発行。

```kotlin
// shared/infrastructure/SpringDomainEventPublisher.kt
@Component
class SpringDomainEventPublisher(
    private val applicationEventPublisher: ApplicationEventPublisher,
) : DomainEventPublisher {

    override fun publish(event: DomainEvent) {
        applicationEventPublisher.publishEvent(event)
    }

    override fun publishAll(events: List<DomainEvent>) {
        events.forEach(::publish)
    }
}
```

### イベントハンドラ

```kotlin
@Component
class MvpEvaluationEventHandler(
    private val mvpStatusUpdater: MvpStatusUpdater,
) {
    @EventListener
    fun on(event: EventFinished) {
        mvpStatusUpdater.markEvaluationReady(event.eventId)
    }
}
```

### 将来の拡張

必要に応じて以下に移行可能（現時点では不要）:
- Transactional Outbox パターン
- メッセージブローカー（Kafka, RabbitMQ）
- 非同期イベント処理

---

## 外部 API 連携（Gemini）

```kotlin
// mvp/infrastructure/adapter/GeminiApiAdapter.kt
@Component
class GeminiApiAdapter(
    @Value("\${gemini.api-key}") private val apiKey: String,
    @Value("\${gemini.model:gemini-2.0-flash}") private val model: String,
    private val restClient: RestClient,
) : AiEvaluationPort {

    override fun evaluate(prompt: String): String {
        // RestClient で Gemini API を呼び出し
        // タイムアウト: 30秒
        // リトライ: Spring Retry で最大2回
    }
}
```

- API Key は環境変数 `GEMINI_API_KEY` から取得
- Domain 層は `AiEvaluationPort` インターフェースのみ知る
- 実装の詳細（HTTP クライアント、リトライ）は Infrastructure 層に閉じる

---

## ID 生成

UUID v7 を採用。時系列順に並ぶため B-Tree インデックスの断片化を抑制する。

```kotlin
// shared/infrastructure/UuidV7IdGenerator.kt
@Component
class UuidV7IdGenerator : IdGenerator {
    override fun generate(): String = UuidCreator.getTimeOrderedEpoch().toString()
}
```

---

## ロギング

### Companion Object パターン

```kotlin
@Service
class CreateEventUseCase(...) {
    companion object {
        private val logger = LoggerFactory.getLogger(CreateEventUseCase::class.java)
    }

    fun execute(command: CreateEventCommand): CreateEventResult {
        logger.info("イベント作成開始: name={}", command.name)
        // ...
        logger.info("イベント作成完了: id={}", result.eventId.value)
        return result
    }
}
```

### ルール

- パラメータ化メッセージを使う（文字列結合しない）
- 機密情報（パスワード、トークン）はログに出さない
- UseCase の開始・完了をログに記録する

---

## 設定管理

### application.yml 構成

```yaml
spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true

jwt:
  secret: ${JWT_SECRET}
  expiration-ms: 86400000  # 24時間

gemini:
  api-key: ${GEMINI_API_KEY}
  model: gemini-2.0-flash
```

### プロファイル

| プロファイル | 用途 |
|---|---|
| `default` | ローカル開発（Docker Compose） |
| `test` | テスト実行（Testcontainers） |
| `prod` | 本番環境 |

---

## 設計の鉄則まとめ

| # | ルール |
|---|---|
| 1 | Domain はフレームワークに依存しない（純粋 Kotlin） |
| 2 | JPA Entity は `infrastructure/persistence/entity/` にのみ配置 |
| 3 | 依存方向は外側→内側のみ（ArchUnit で強制） |
| 4 | Write は集約 + Repository 経由、Read は QueryService で直接 DTO 射影 |
| 5 | Fetch は基本 LAZY、必要なタイミングで明示的にロード |
| 6 | 層をまたぐ場合は Mapper で明示的に変換 |
| 7 | Command と Query は物理的に分離 |
| 8 | 他コンテキスト呼び出しは Port 経由 |
| 9 | Controller は Command / Query で分割 |
| 10 | スキーマ管理は Flyway、`ddl-auto=validate` 固定 |
| 11 | Request/Response は openapi-generator で自動生成 |
| 12 | N+1 は SQL ログ検証テストで検出 |
