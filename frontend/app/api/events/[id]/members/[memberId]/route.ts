import { NextResponse } from "next/server";
import {
  deleteMember,
  updateMember,
  type MemberUpdate,
} from "@/features/member/api/member-api";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id, memberId } = await params;
  let body: MemberUpdate;
  try {
    body = (await request.json()) as MemberUpdate;
  } catch {
    return NextResponse.json(
      { code: "BAD_REQUEST", message: "不正なリクエストです" },
      { status: 400 },
    );
  }
  try {
    await updateMember(id, memberId, body);
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id, memberId } = await params;
  try {
    await deleteMember(id, memberId);
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
