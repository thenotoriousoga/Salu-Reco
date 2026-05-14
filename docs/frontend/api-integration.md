# API 連携設計

## 概要

バックエンド（Spring Boot）が提供する REST API と型安全に通信する。
OpenAPI スキーマから TypeScript 型を自動生成し、`openapi-fetch` で型推論付きのリクエストを行う。

## API クライアントアーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│  Client Component                                       │
│  fetch("/api/events/...") → Route Handler (BFF)         │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Route Handler / Server Component                       │
│  createServerApiClient() → openapi-fetch + JWT          │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Backend (Spring Boot)                                  │
│  REST API (OpenAPI 3.1)                                 │
└─────────────────────────────────────────────────────────┘
```

## 型生成

### OpenAPI → TypeScript

```bash
pnpm gen:api
# 実行内容: openapi-typescript /api/openapi.yaml -o shared/api/schema.ts
```

生成される `shared/api/schema.ts` には以下が含まれる:
- `paths`: 全エンドポイントの型定義
- `components`: リクエスト/レスポンスのスキーマ型
- `operations`: 各操作の入出力型

### 型生成のタイミング

- バックエンドの API 定義（`api/openapi.yaml`）が更新されたとき
- CI/CD パイプラインで自動実行（型の不整合を検出）

## API クライアント

### サーバーサイド用クライアント

Server Components や Route Handlers から使用する。Cookie の JWT を Authorization ヘッダに付与する。

```typescript
// shared/api/client.ts
export async function createServerApiClient() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const client = createClient<paths>({ baseUrl: serverBaseUrl });

  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      if (token) {
        request.headers.set("Authorization", `Bearer ${token}`);
      }
      return request;
    },
  };
  client.use(authMiddleware);
  return client;
}
```

### Feature API 関数

各 Feature モジュールに、サーバーサイド専用の API 呼び出し関数を配置する。

```typescript
// features/event/api/event-api.ts
import "server-only";
import { createServerApiClient } from "@/shared/api/client";

export async function listEvents() {
  const api = await createServerApiClient();
  const { data, error, response } = await api.GET("/api/events", {});
  if (error) {
    throw new Error(`イベント一覧の取得に失敗しました (status=${response.status})`);
  }
  return data!;
}
```

**`"server-only"` インポートにより、クライアントバンドルへの混入を防止する。**

## BFF パターン (Route Handlers)

Client Components からバックエンドへ直接通信せず、Next.js の Route Handlers を BFF として経由する。

### 目的

1. **JWT の隠蔽**: httpOnly Cookie に保存した JWT をクライアント JavaScript に露出させない
2. **CORS 回避**: 同一オリジンからのリクエストとして処理
3. **レスポンス加工**: バックエンドのレスポンスをフロントエンドに最適化

### Route Handler の実装パターン

```typescript
// app/api/events/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  try {
    const data = await createEvent(body);  // サーバーサイド API 関数を呼び出し
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { code: "CREATE_FAILED", message: err.message },
      { status: 500 },
    );
  }
}
```

### Client Components からの呼び出し

```typescript
const res = await fetch("/api/events", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(values),
});
```

## 認証フロー

### ログイン

```
1. Client → POST /api/auth/login (Route Handler)
2. Route Handler → POST /api/auth/login-admin (Backend)
3. Backend → JWT を返却
4. Route Handler → Set-Cookie: salurec_token=JWT; HttpOnly; Secure; SameSite=Lax
5. Client → リダイレクト /events
```

### 認証状態の確認

```
1. Server Component → Cookie から JWT 取得
2. Server Component → GET /api/auth/me (Backend) + Authorization: Bearer JWT
3. Backend → { authenticated: true, role: "ADMIN", eventId: null }
4. Server Component → 認証情報に基づいてレンダリング
```

### ログアウト

```
1. Client → POST /api/auth/logout (Route Handler)
2. Route Handler → Set-Cookie: salurec_token=; maxAge=0
3. Client → リダイレクト /login
```

## エラーハンドリング

### バックエンドのエラーレスポンス形式

```json
{
  "code": "EVENT_NOT_FOUND",
  "message": "イベントが見つかりません"
}
```

### フロントエンドでのエラー処理

| レイヤー | エラー処理 |
|---|---|
| Server Component | `throw new Error()` → Next.js error boundary |
| Route Handler | エラーレスポンスをそのまま返却 |
| Client Component | try/catch → `toast.error()` で通知 |

### エラー表示パターン

```typescript
try {
  const res = await fetch("/api/events", { method: "POST", ... });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message ?? `作成に失敗しました (${res.status})`);
  }
  toast.info("作成しました");
} catch (err) {
  toast.error(err instanceof Error ? err.message : "エラーが発生しました");
}
```

## API エンドポイント一覧

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/auth/login-admin` | 管理者パスワードでログイン |
| POST | `/api/auth/login-with-code` | 参加コードでログイン |
| GET | `/api/auth/me` | 現在のログイン情報取得 |
| GET | `/api/events` | イベント一覧取得 |
| POST | `/api/events` | イベント作成 |
| GET | `/api/events/{eventId}` | イベント詳細取得 |
| POST | `/api/events/{eventId}/start` | イベントを進行中にする |
| POST | `/api/events/{eventId}/finish` | イベントを終了する |
| POST | `/api/events/{eventId}/reopen` | イベントを進行中に戻す |
| GET | `/api/events/{eventId}/members` | メンバー一覧取得 |
| POST | `/api/events/{eventId}/members` | メンバー一括登録 |
| PUT | `/api/events/{eventId}/members/{memberId}` | メンバー情報更新 |
| DELETE | `/api/events/{eventId}/members/{memberId}` | メンバー削除 |
| PUT | `/api/events/{eventId}/members/{memberId}/enthusiasm` | 意気込み更新 |
