import "server-only";
import { cookies } from "next/headers";

/**
 * サーバーサイド限定のユーティリティ。
 * Cookie に保存された JWT を取り出してバックエンドへ転送するために使う。
 *
 * - JWT の検証自体はバックエンドが行う(署名鍵を共有しないため)
 * - Next.js ミドルウェアでの簡易ガードには `/api/auth/me` を呼んで判定
 */

export const AUTH_COOKIE_NAME = "salurec_token";

/** Cookie から生の JWT 文字列を取得(サーバー専用) */
export async function getAuthToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(AUTH_COOKIE_NAME)?.value ?? null;
}

/**
 * バックエンドの /api/auth/me を呼んで現在のロール情報を取得する。
 * 未認証または期限切れなら null を返す。
 */
export async function getAuthInfo(): Promise<{
  role: "ADMIN" | "USER";
  eventId: string | null;
} | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const baseUrl =
    process.env.BACKEND_INTERNAL_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://backend:8080";

  try {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      authenticated: boolean;
      role: "ADMIN" | "USER" | null;
      eventId: string | null;
    };
    if (!body.authenticated || !body.role) return null;
    return { role: body.role, eventId: body.eventId };
  } catch {
    return null;
  }
}
