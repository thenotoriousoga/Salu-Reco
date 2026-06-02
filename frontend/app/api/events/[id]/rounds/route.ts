import { NextResponse } from "next/server";
import {
  createRound,
  listRounds,
  type CreateRoundInput,
} from "@/features/round/api/round-api";

/**
 * クライアントコンポーネントからラウンド一覧取得・作成を呼ぶ Route Handler。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const data = await listRounds(id);
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: CreateRoundInput;
  try {
    body = (await request.json()) as CreateRoundInput;
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "不正なリクエストです" },
      { status: 400 },
    );
  }

  try {
    const data = await createRound(id, body);
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
