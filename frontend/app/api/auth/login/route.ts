import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/shared/lib/auth";

/**
 * ログイン: バックエンドの認証エンドポイントを叩き、
 * 成功したら JWT を httpOnly Cookie に焼いて返す。
 *
 * リクエストボディ:
 *   { mode: "admin", password: string }
 *   { mode: "joinCode", joinCode: string }
 */
type LoginRequest =
  | { mode: "admin"; password: string }
  | { mode: "joinCode"; joinCode: string };

type LoginResponse = {
  token: string;
  role: "ADMIN" | "USER";
  eventId: string | null;
  expiresAtEpochSeconds: number;
};

const BACKEND_BASE_URL =
  process.env.BACKEND_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://backend:8080";

export async function POST(request: Request) {
  let payload: LoginRequest;
  try {
    payload = (await request.json()) as LoginRequest;
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "不正なリクエストです" },
      { status: 400 },
    );
  }

  const { endpoint, body } =
    payload.mode === "admin"
      ? {
          endpoint: "/api/auth/login-admin",
          body: JSON.stringify({ password: payload.password }),
        }
      : {
          endpoint: "/api/auth/login-with-code",
          body: JSON.stringify({ joinCode: payload.joinCode }),
        };

  const upstream = await fetch(`${BACKEND_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  }

  const data = JSON.parse(text) as LoginResponse;

  const res = NextResponse.json({
    role: data.role,
    eventId: data.eventId,
  });
  res.cookies.set(AUTH_COOKIE_NAME, data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // JWT の有効期限に合わせる(秒)。1分の安全マージンを引く
    maxAge: Math.max(60, data.expiresAtEpochSeconds - Math.floor(Date.now() / 1000) - 60),
  });
  return res;
}
