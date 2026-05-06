# フロントエンド アーキテクチャ (Next.js + TypeScript)

## 方針

- **App Router** を採用。ページごとのレイアウト・データフェッチを柔軟に
- **Server Components をデフォルト** に。Client Componentsは最小限 (`"use client"`)
- **認証情報はCookie**(httpOnly) に JWT を保存。Server Components から扱えるよう
- **状態管理はサーバー状態(TanStack Query)とクライアント状態(Zustand)を分離**
- **API 型は OpenAPI から自動生成** (手書きしない)
- **既存のデザインシステム(Vibrant & Block-based)を踏襲**
- **コンテキスト境界を Feature フォルダで表現**

## ディレクトリ構成

```
frontend/
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.local.example
├── app/                                    ← Next.js App Router
│   ├── layout.tsx                          ルートレイアウト (html/body, Fonts)
│   ├── page.tsx                            ランディング (ログインへリダイレクト)
│   ├── login/
│   │   └── page.tsx                        ログイン画面 (管理者 or イベントコード)
│   ├── (admin)/                            管理者向けルートグループ
│   │   ├── layout.tsx                      管理者レイアウト (認証ガード)
│   │   ├── events/
│   │   │   ├── page.tsx                    イベント一覧
│   │   │   └── new/
│   │   │       └── page.tsx                イベント作成
│   │   └── ...
│   ├── events/[eventId]/                   イベント詳細 (管理者・参加者共通)
│   │   ├── layout.tsx                      認証ガード + イベント基本情報取得
│   │   ├── page.tsx                        概要タブ
│   │   ├── members/page.tsx                メンバータブ
│   │   ├── matches/page.tsx                試合タブ
│   │   └── results/page.tsx                結果タブ
│   └── api/                                (原則使わない。バックエンドへ直接フェッチ)
│
├── features/                               ← コンテキストごとに分割
│   ├── event/
│   │   ├── api/                            API呼び出し (Server Actions or fetch関数)
│   │   ├── components/                     Eventに特化したコンポーネント
│   │   ├── hooks/                          TanStack Query hooks
│   │   └── schema.ts                       Zodスキーマ (フォーム入力検証)
│   ├── member/
│   ├── match/
│   ├── mvp/
│   ├── survey/
│   └── auth/
│
├── shared/
│   ├── api/
│   │   ├── client.ts                       openapi-fetch ベースのクライアント
│   │   └── schema.ts                       openapi-typescript で自動生成された型
│   ├── components/
│   │   └── ui/                             shadcn/ui の生成物
│   ├── hooks/
│   │   └── use-auth.ts                     認証状態フック
│   ├── lib/
│   │   ├── cn.ts                           Tailwindのclass結合
│   │   └── errors.ts                       エラー変換ユーティリティ
│   └── store/
│       └── auth.ts                         Zustand ストア (認証状態)
│
└── public/
    └── ...
```

### ルーティング方針

| パス | ロール | 備考 |
|---|---|---|
| `/login` | 未認証 | 管理者ログインとイベントコード参加の両UI |
| `/events` | ADMIN | イベント一覧 |
| `/events/new` | ADMIN | イベント作成 |
| `/events/[eventId]/...` | ADMIN, USER(当該イベントのみ) | イベント詳細。タブ切り替え |

`(admin)` のようなルートグループで認証ガードを layout に仕込み、
`/events/[eventId]` は両ロールアクセス可能なので別ルートとして配置。

---

## 認証フロー

### 方針: httpOnly Cookie + Route Handler で JWT を管理

1. ユーザーが `/login` で管理者パスワードまたはイベントコードを送信
2. `app/api/auth/login/route.ts` が Spring Boot の `/api/auth/login-admin` を叩く
3. 成功したら `Set-Cookie: salurec_token=JWT; HttpOnly; Secure; SameSite=Lax` を返す
4. 以降の Server Components や Server Actions はこの Cookie を読み取り、
   バックエンド呼び出し時に `Authorization: Bearer ${token}` として転送
5. ログアウトは Cookie 削除

### なぜ Cookie なのか

- Next.js Server Components は localStorage にアクセスできない
- XSS対策として httpOnly Cookie の方が安全
- JWT を直接クライアントに露出させない

### 認証ガードの実装例

```tsx
// app/(admin)/layout.tsx
import { getAuthInfo } from "@/shared/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthInfo();
  if (!auth || auth.role !== "ADMIN") {
    redirect("/login");
  }
  return <>{children}</>;
}
```

```ts
// shared/lib/auth.ts (Server only)
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function getAuthInfo(): Promise<{ role: "ADMIN" | "USER", eventId?: string } | null> {
  const token = (await cookies()).get("salurec_token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { role: payload.role as any, eventId: payload.eventId as any };
  } catch {
    return null;
  }
}
```

**補足**: JWT は Spring Boot 側で署名しているので、Next.js 側は公開鍵検証するか、
`jwks` エンドポイントを用意。初期実装では対称鍵 (HS256) で共有秘密にするのが簡単。

---

## API クライアント

### OpenAPI 型生成

Spring Boot の `springdoc-openapi` が `http://localhost:8080/v3/api-docs` にスキーマを公開する。
これを使って TypeScript の型を自動生成。

```bash
# frontend/
pnpm openapi-typescript http://localhost:8080/v3/api-docs \
     -o shared/api/schema.ts
```

### 呼び出し側

```ts
// shared/api/client.ts
import createClient from "openapi-fetch";
import type { paths } from "./schema";

export function createApiClient(token?: string) {
  return createClient<paths>({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
```

### Server Component からの呼び出し

```tsx
// features/event/api/get-events.ts
import { createApiClient } from "@/shared/api/client";
import { cookies } from "next/headers";

export async function getEvents() {
  const token = (await cookies()).get("salurec_token")?.value;
  const api = createApiClient(token);
  const { data, error } = await api.GET("/api/events");
  if (error) throw new Error("Failed to fetch events");
  return data;
}
```

### Client Component からの呼び出し (TanStack Query)

```tsx
// features/event/hooks/use-events.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { createApiClient } from "@/shared/api/client";

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const api = createApiClient();  // Cookieは自動送信される
      const { data, error } = await api.GET("/api/events");
      if (error) throw error;
      return data!;
    },
  });
}
```

Cookie はブラウザから自動送信されるので、クライアントコンポーネントでは `credentials: "include"` を付ければ token を手動で渡さなくてよい。

---

## コンポーネント設計

### 階層

```
Page (Server Component)
  └─ Feature Component (Server or Client)
       └─ Feature UI (Client Component)
            └─ shared/components/ui/* (純UIコンポーネント)
```

### 例: イベント一覧ページ

```tsx
// app/(admin)/events/page.tsx (Server Component)
import { getEvents } from "@/features/event/api/get-events";
import { EventList } from "@/features/event/components/event-list";

export default async function EventsPage() {
  const events = await getEvents();
  return (
    <main>
      <h1>イベント一覧</h1>
      <EventList events={events} />
    </main>
  );
}
```

```tsx
// features/event/components/event-list.tsx (Client Component)
"use client";

import { EventCard } from "./event-card";

export function EventList({ events }: { events: Event[] }) {
  return (
    <div className="grid gap-3">
      {events.map((e) => <EventCard key={e.id} event={e} />)}
    </div>
  );
}
```

---

## フォーム処理

### 使うライブラリ

- **React Hook Form**: フォーム状態管理
- **Zod**: スキーマ検証 (バックエンドと同じルールをクライアントでも再現)

### 例

```tsx
// features/event/components/create-event-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "イベント名を入力してください").max(100),
  date: z.string().min(1, "日付を選択してください"),
  organizerName: z.string().min(1, "あなたの名前を入力してください"),
});

type FormValues = z.infer<typeof schema>;

export function CreateEventForm() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = form.handleSubmit(async (values) => {
    const api = createApiClient();
    const { data, error } = await api.POST("/api/events", { body: values });
    // ...
  });

  return <form onSubmit={onSubmit}>{/* ... */}</form>;
}
```

---

## スタイル

### 既存デザインの移植

現状の `css.html` は CSS変数ベース(`--primary` など)。
Tailwind に移植する際は `tailwind.config.ts` のカラーパレットに同じ値をマップする。

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: "hsl(var(--primary))",
        // ...
      },
      fontFamily: {
        sans: ["var(--font-fira-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-fira-code)", ...defaultTheme.fontFamily.mono],
      },
    },
  },
};
```

### Fira Sans / Fira Code

Next.js の `next/font/google` を使う。

```tsx
// app/layout.tsx
import { Fira_Sans, Fira_Code } from "next/font/google";

const firaSans = Fira_Sans({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-fira-sans" });
const firaCode = Fira_Code({ subsets: ["latin"], variable: "--font-fira-code" });

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={`${firaSans.variable} ${firaCode.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

---

## エラーハンドリング

### バックエンドのエラー形式 (共通)

```json
{
  "code": "EVENT_NOT_FOUND",
  "message": "イベントが見つかりません",
  "details": { "eventId": "xxx" }
}
```

### クライアント側

```tsx
// shared/lib/api-error.ts
export class ApiError extends Error {
  constructor(public code: string, public status: number, message: string) {
    super(message);
  }
}

export async function unwrap<T>(promise: Promise<{ data?: T; error?: any }>): Promise<T> {
  const { data, error } = await promise;
  if (error) {
    throw new ApiError(error.code ?? "UNKNOWN", 500, error.message ?? "エラーが発生しました");
  }
  return data!;
}
```

---

## 開発サーバー

```bash
# バックエンド起動 (別ターミナル)
cd backend && ./gradlew bootRun

# フロントエンド起動
cd frontend && pnpm dev
```

- バックエンド: http://localhost:8080
- フロントエンド: http://localhost:3000
- OpenAPI UI: http://localhost:8080/swagger-ui

`.env.local` に `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080` を設定。
