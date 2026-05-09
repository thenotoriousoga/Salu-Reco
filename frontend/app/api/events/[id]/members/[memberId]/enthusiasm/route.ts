import { NextResponse } from "next/server";
import { updateEnthusiasm } from "@/features/member/api/member-api";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id, memberId } = await params;
  let body: { enthusiasm: string };
  try {
    body = (await request.json()) as { enthusiasm: string };
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "不正なリクエストです" },
      { status: 400 },
    );
  }
  try {
    await updateEnthusiasm(id, memberId, body.enthusiasm);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        code: "UPDATE_FAILED",
        message: err instanceof Error ? err.message : "更新に失敗しました",
      },
      { status: 500 },
    );
  }
}
