import { NextResponse } from "next/server";
import { getRoundDetail } from "@/features/round/api/round-api";

/**
 * クライアントコンポーネントからラウンド詳細を取得する Route Handler。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; roundId: string }> },
) {
  const { id, roundId } = await params;
  try {
    const data = await getRoundDetail(id, roundId);
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
