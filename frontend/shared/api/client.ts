import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./schema";

/**
 * OpenAPI スキーマから生成された型付き fetch クライアント。
 *
 * サーバーサイドからは `BACKEND_INTERNAL_URL`(Docker 内通信)で叩き、
 * Next.js の cookies() から JWT を取り出して Authorization ヘッダに付与する。
 * クライアントサイドからはブラウザ → Next.js Route Handler 経由でアクセスする想定なので、
 * 直接バックエンドを叩くことは原則しない。
 */

const serverBaseUrl =
  process.env.BACKEND_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://backend:8080";

const browserBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const baseUrl = typeof window === "undefined" ? serverBaseUrl : browserBaseUrl;

export const apiClient = createClient<paths>({ baseUrl });

/**
 * サーバーサイド用: Cookie の JWT を Authorization ヘッダに付ける fetch クライアント。
 * Server Component / Server Action から使う。
 */
export async function createServerApiClient() {
  const { cookies } = await import("next/headers");
  const { AUTH_COOKIE_NAME } = await import("@/shared/lib/auth");
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
