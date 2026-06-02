import { NextResponse } from "next/server";
import {
  addSubstitute,
  finishMatch,
  reopenMatch,
  type AddSubstituteInput,
} from "@/features/match/api/match-api";

/**
 * マッチのステータス遷移・助っ人追加を呼ぶ Route Handler。
 * action: "finish" | "reopen" | "substitutes"
 */
const ACTIONS = ["finish", "reopen", "substitutes"] as const;
type Action = (typeof ACTIONS)[number];

function isAction(value: string): value is Action {
  return (ACTIONS as readonly string[]).includes(value);
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; roundId: string; matchId: string; action: string }>;
  },
) {
  const { id, roundId, matchId, action } = await params;
  if (!isAction(action)) {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: `不明なアクション: ${action}` },
      { status: 400 },
    );
  }

  try {
    if (action === "finish") {
      await finishMatch(id, roundId, matchId);
    } else if (action === "reopen") {
      await reopenMatch(id, roundId, matchId);
    } else {
      // substitutes
      let body: AddSubstituteInput;
      try {
        body = (await request.json()) as AddSubstituteInput;
      } catch {
        return NextResponse.json(
          { code: "BAD_REQUEST", message: "不正なリクエストです" },
          { status: 400 },
        );
      }
      await addSubstitute(id, roundId, matchId, body);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        code: "ACTION_FAILED",
        message: err instanceof Error ? err.message : "処理に失敗しました",
      },
      { status: 500 },
    );
  }
}
