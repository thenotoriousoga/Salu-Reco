import { NextResponse } from "next/server";
import { finishRound, reopenRound } from "@/features/round/api/round-api";

/**
 * ラウンドのステータス遷移を呼ぶ Route Handler。
 * action: "finish" | "reopen"
 */
const ACTIONS = ["finish", "reopen"] as const;
type Action = (typeof ACTIONS)[number];

function isAction(value: string): value is Action {
  return (ACTIONS as readonly string[]).includes(value);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; roundId: string; action: string }> },
) {
  const { id, roundId, action } = await params;
  if (!isAction(action)) {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: `不明なアクション: ${action}` },
      { status: 400 },
    );
  }

  try {
    if (action === "finish") await finishRound(id, roundId);
    else await reopenRound(id, roundId);
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
