# Presentation 層（API-first アプローチ）

## 方針

`api/openapi.yaml` を Single Source of Truth とし、`openapi-generator` で Controller インターフェースと Request/Response モデルを自動生成する。

### 生成物

| 生成先 | 内容 |
|---|---|
| `com.salurec.generated.api` | Controller インターフェース（tag ごとに分割） |
| `com.salurec.generated.model` | Request/Response データクラス |

### 手書き DTO は不要

Request/Response の data class は openapi-generator が自動生成する。
`presentation/dto/` パッケージは作らず、`com.salurec.generated.model` を直接使用する。

---

## Controller 実装パターン

Controller は生成インターフェースを実装し、UseCase を呼び出す。

### Command Controller

```kotlin
package com.salurec.event.presentation.controller

import com.salurec.event.application.command.CreateEventUseCase
import com.salurec.event.application.dto.CreateEventCommand
import com.salurec.generated.api.EventCommandApi
import com.salurec.generated.model.CreateEventRequest
import com.salurec.generated.model.CreateEventResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class EventCommandController(
    private val createEventUseCase: CreateEventUseCase,
    private val startEventUseCase: StartEventUseCase,
    private val finishEventUseCase: FinishEventUseCase,
    private val reopenEventUseCase: ReopenEventUseCase,
) : EventCommandApi {

    override fun createEvent(
        createEventRequest: CreateEventRequest,
    ): ResponseEntity<CreateEventResponse> {
        val command = CreateEventCommand(
            name = createEventRequest.name,
            date = createEventRequest.date,
            organizerName = createEventRequest.organizerName ?: "",
        )
        val result = createEventUseCase.execute(command)
        return ResponseEntity.status(HttpStatus.CREATED).body(
            CreateEventResponse(
                eventId = result.eventId.value,
                joinCode = result.joinCode.value,
                organizerMemberId = result.organizerMemberId,
            ),
        )
    }

    override fun startEvent(eventId: String): ResponseEntity<Unit> {
        startEventUseCase.execute(eventId)
        return ResponseEntity.noContent().build()
    }
}
```

### Query Controller

```kotlin
@RestController
class EventQueryController(
    private val eventQueryService: EventQueryService,
) : EventQueryApi {

    override fun listEvents(): ResponseEntity<EventListResponse> {
        val items = eventQueryService.list().map { dto ->
            EventListItemResponse(
                id = dto.id,
                name = dto.name,
                date = dto.date,
                status = dto.status,
                joinCode = dto.joinCode,
                memberCount = dto.memberCount,
            )
        }
        return ResponseEntity.ok(EventListResponse(events = items))
    }

    override fun getEventDetail(eventId: String): ResponseEntity<EventDetailResponse> {
        val dto = eventQueryService.findDetail(eventId)
            ?: throw EventNotFoundException(eventId)
        return ResponseEntity.ok(toResponse(dto))
    }
}
```

---

## Controller の設計ルール

| ルール | 理由 |
|---|---|
| Command / Query で Controller を分割 | CQRS の物理的分離。責務が明確 |
| Controller にビジネスロジックを書かない | ロジックは UseCase / Domain に集約 |
| Request → Command の変換は Controller 内で行う | 薄い変換のみ。複雑なら Mapper を切り出す |
| 認可チェックは Controller で行う | `AuthPrincipal` を使った動的認可 |
| バリデーションは Bean Validation + ドメイン層 | Request の形式検証は `@Valid`、ビジネスルールは Domain |

---

## エラーレスポンス

`GlobalExceptionHandler` で統一的なエラーレスポンスを返す。

```kotlin
package com.salurec.shared.web

import com.salurec.shared.domain.DomainException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ControllerAdvice
import org.springframework.web.bind.annotation.ExceptionHandler

@ControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(DomainException::class)
    fun handleDomainException(ex: DomainException): ResponseEntity<ApiErrorResponse> {
        val status = when (ex) {
            is NotFoundException -> HttpStatus.NOT_FOUND
            is InvalidStateException -> HttpStatus.CONFLICT
            else -> HttpStatus.BAD_REQUEST
        }
        return ResponseEntity.status(status).body(
            ApiErrorResponse(
                error = ex::class.simpleName ?: "DomainError",
                message = ex.message ?: "不明なエラー",
            ),
        )
    }
}

data class ApiErrorResponse(
    val error: String,
    val message: String,
)
```

---

## OpenAPI Generator 設定

`build.gradle.kts` での設定:

```kotlin
openApiGenerate {
    generatorName.set("kotlin-spring")
    inputSpec.set("/api/openapi.yaml")
    outputDir.set(generatedSourceDir.map { it.asFile.absolutePath })
    apiPackage.set("com.salurec.generated.api")
    modelPackage.set("com.salurec.generated.model")
    configOptions.set(
        mapOf(
            "interfaceOnly" to "true",       // インターフェースのみ生成
            "useSpringBoot3" to "true",
            "useTags" to "true",             // tag ごとに API 分割
            "documentationProvider" to "none",
            "serializationLibrary" to "jackson",
            "enumPropertyNaming" to "original",
            "dateLibrary" to "java8-localdatetime",
            "reactive" to "false",
        ),
    )
}
```

`interfaceOnly = true` により、生成されるのはインターフェースのみ。
実装は手書きの Controller で行い、UseCase を呼び出す。
