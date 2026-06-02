import { NextResponse } from "next/server";
import { removeGoal } from "@/features/match/api/match-api";

/**
 * クライアントコンポーネントから得点を取り消す Route Handler。
 */
export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; roundId: string; matchId: string; goalId: string }>;
  },
) {
  const { id, roundId, matchId, goalId } = await params;
  try {
    await removeGoal(id, roundId, matchId, goalId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        code: "DELETE_FAILED",
        message: err instanceof Error ? err.message : "削除に失敗しました",
      },
      { status: 500 },
    );
  }
}
