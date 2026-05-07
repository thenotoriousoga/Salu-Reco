import { NextResponse } from "next/server";
import { createEvent } from "@/features/event/api/event-api";

/**
 * クライアントコンポーネントから呼び出すためのイベント作成 Route Handler。
 * 実体はサーバーサイドの createEvent() を叩き、Cookie の JWT をバックエンドに転送する。
 */
export async function POST(request: Request) {
  let body: { name: string; date: string };
  try {
    body = (await request.json()) as { name: string; date: string };
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "不正なリクエストです" },
      { status: 400 },
    );
  }

  try {
    const data = await createEvent(body);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        code: "CREATE_FAILED",
        message: err instanceof Error ? err.message : "作成に失敗しました",
      },
      { status: 500 },
    );
  }
}
