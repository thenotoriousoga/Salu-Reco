import { NextResponse } from "next/server";
import { getMatchDetail } from "@/features/match/api/match-api";

/**
 * クライアントコンポーネントからマッチ詳細を取得する Route Handler。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; roundId: string; matchId: string }> },
) {
  const { id, roundId, matchId } = await params;
  try {
    const data = await getMatchDetail(id, roundId, matchId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        code: "FETCH_FAILED",
        message: err instanceof Error ? err.message : "取得に失敗しました",
      },
      { status: 500 },
    );
  }
}
