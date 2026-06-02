import { NextResponse } from "next/server";
import { recordGoal, type RecordGoalInput } from "@/features/match/api/match-api";

/**
 * クライアントコンポーネントから得点を記録する Route Handler。
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; roundId: string; matchId: string }> },
) {
  const { id, roundId, matchId } = await params;
  let body: RecordGoalInput;
  try {
    body = (await request.json()) as RecordGoalInput;
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "不正なリクエストです" },
      { status: 400 },
    );
  }

  try {
    const data = await recordGoal(id, roundId, matchId, body);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      {
        code: "RECORD_FAILED",
        message: err instanceof Error ? err.message : "記録に失敗しました",
      },
      { status: 500 },
    );
  }
}
