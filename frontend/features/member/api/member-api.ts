import "server-only";
import { createServerApiClient } from "@/shared/api/client";

/**
 * Member コンテキストの API クライアント(サーバーサイド専用)。
 */

export type MemberInput = {
  name: string;
  seniorityYear: number;
  soccerExperience: "Experienced" | "Inexperienced";
  isOrganizer?: boolean;
  note?: string;
};

export type MemberUpdate = {
  name: string;
  seniorityYear: number;
  soccerExperience: "Experienced" | "Inexperienced";
  isOrganizer: boolean;
  note: string;
  enthusiasm?: string;
};

export async function listMembers(eventId: string) {
  const api = await createServerApiClient();
  const { data, error, response } = await api.GET(
    "/api/events/{eventId}/members",
    { params: { path: { eventId } } },
  );
  if (error) {
    throw new Error(
      `メンバー一覧の取得に失敗しました (status=${response.status})`,
    );
  }
  return data!;
}

export async function bulkRegisterMembers(
  eventId: string,
  members: MemberInput[],
) {
  const api = await createServerApiClient();
  const { data, error, response } = await api.POST(
    "/api/events/{eventId}/members",
    {
      params: { path: { eventId } },
      body: { members },
    },
  );
  if (error) {
    throw new Error(
      `メンバー登録に失敗しました (status=${response.status})`,
    );
  }
  return data!;
}

export async function updateMember(
  eventId: string,
  memberId: string,
  update: MemberUpdate,
) {
  const api = await createServerApiClient();
  const { error, response } = await api.PUT(
    "/api/events/{eventId}/members/{memberId}",
    {
      params: { path: { eventId, memberId } },
      body: update,
    },
  );
  if (error) {
    throw new Error(
      `メンバー更新に失敗しました (status=${response.status})`,
    );
  }
}

export async function updateEnthusiasm(
  eventId: string,
  memberId: string,
  enthusiasm: string,
) {
  const api = await createServerApiClient();
  const { error, response } = await api.PUT(
    "/api/events/{eventId}/members/{memberId}/enthusiasm",
    {
      params: { path: { eventId, memberId } },
      body: { enthusiasm },
    },
  );
  if (error) {
    throw new Error(
      `意気込み更新に失敗しました (status=${response.status})`,
    );
  }
}

export async function deleteMember(eventId: string, memberId: string) {
  const api = await createServerApiClient();
  const { error, response } = await api.DELETE(
    "/api/events/{eventId}/members/{memberId}",
    { params: { path: { eventId, memberId } } },
  );
  if (error) {
    throw new Error(
      `メンバー削除に失敗しました (status=${response.status})`,
    );
  }
}
