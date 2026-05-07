import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/shared/lib/auth";

/**
 * ログアウト: Cookie を削除するだけ(JWT 自体は有効期限切れまで残る = 想定内)。
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
  });
  return res;
}
