import { NextResponse } from "next/server";
import {
  finishEvent,
  reopenEvent,
  startEvent,
} from "@/features/event/api/event-api";

/**
 * クライアントコンポーネントからイベントステータス遷移を呼ぶための Route Handler。
 * バックエンドの /api/events/{id}/start|finish|reopen に Cookie の JWT を転送する。
 */
const ACTIONS = ["start", "finish", "reopen"] as const;
type Action = (typeof ACTIONS)[number];

function isAction(value: string): value is Action {
  return (ACTIONS as readonly string[]).includes(value);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await params;
  if (!isAction(action)) {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: `不明なアクション: ${action}` },
      { status: 400 },
    );
  }

  try {
    if (action === "start") await startEvent(id);
    else if (action === "finish") await finishEvent(id);
    else await reopenEvent(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        code: "TRANSITION_FAILED",
        message: err instanceof Error ? err.message : "遷移に失敗しました",
      },
      { status: 409 },
    );
  }
}
