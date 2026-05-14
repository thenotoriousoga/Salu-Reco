# Identity & Access コンテキスト — ユースケース

ステートレスなため集約は軽量。DB テーブルを持たない。

## ドメイン概念

### Administrator

- パスワードは環境変数 `ADMIN_PASSWORD` に保持
- DB には保存しない
- ログイン成功時に JWT を発行する

### EventAccessToken (値オブジェクト)

```
EventAccessToken (ValueObject)
├── role: Role (ADMIN / USER)
├── eventId: EventId?          USERの場合は必須、ADMINの場合はnull
├── memberId: MemberId?        参加者ログイン時、どのメンバーとして入ったか（任意）
└── expiresAt: Instant
```

JWT のペイロードとしてシリアライズされる。

## Command (Write)

| UseCase | 入力 | 出力 | 前提条件 |
|---|---|---|---|
| `LoginAsAdminUseCase` | `password` | `AuthToken(token, role)` | パスワードが一致 |
| `LoginWithJoinCodeUseCase` | `joinCode` | `AuthToken(token, role, eventId)` | JoinCode に対応するイベントが存在 |

## JWT ペイロード

```json
{
  "sub": "admin" または "user:ABCD",
  "role": "ADMIN" または "USER",
  "eventId": "xxx",
  "iat": 1234567890,
  "exp": 1234567890
}
```

## 認可方針

- URL パターン + HTTP メソッドで `SecurityConfig` に集約（`@PreAuthorize` は使わない）
- 動的認可（特定イベントへのアクセス可否）は Controller 内で `AuthPrincipal.canAccessEvent(eventId)` を呼び出す
