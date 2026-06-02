import "server-only";
import { createServerApiClient } from "@/shared/api/client";
import type { components } from "@/shared/api/schema";

/**
 * Match コンテキストの API クライアント(サーバーサイド専用)。
 */

/** OpenAPI スキーマから導出したマッチ作成リクエスト型 */
export type CreateMatchInput = components["schemas"]["CreateMatchRequest"];

/** OpenAPI スキーマから導出した得点記録リクエスト型 */
export type RecordGoalInput = components["schemas"]["RecordGoalRequest"];

/** OpenAPI スキーマから導出した助っ人追加リクエスト型 */
export type AddSubstituteInput = components["schemas"]["AddSubstituteRequest"];

export async function listMatches(eventId: string, roundId: string) {
  const api = await createServerApiClient();
  const { data, response } = await api.GET(
    "/api/events/{eventId}/rounds/{roundId}/matches",
    { params: { path: { eventId, roundId } } },
  );
  if (!response.ok) {
    throw new Error(
      `マッチ一覧の取得に失敗しました (status=${response.status})`,
    );
  }
  return data!;
}

export async function getMatchDetail(
  eventId: string,
  roundId: string,
  matchId: string,
) {
  const api = await createServerApiClient();
  const { data, error, response } = await api.GET(
    "/api/events/{eventId}/rounds/{roundId}/matches/{matchId}",
    { params: { path: { eventId, roundId, matchId } } },
  );
  if (error) {
    throw new Error(
      `マッチ詳細の取得に失敗しました (status=${response.status})`,
    );
  }
  return data!;
}

export async function createMatch(
  eventId: string,
  roundId: string,
  input: CreateMatchInput,
) {
  const api = await createServerApiClient();
  const { data, error, response } = await api.POST(
    "/api/events/{eventId}/rounds/{roundId}/matches",
    {
      params: { path: { eventId, roundId } },
      body: input,
    },
  );
  if (error) {
    throw new Error(
      `マッチ作成に失敗しました (status=${response.status})`,
    );
  }
  return data!;
}

export async function recordGoal(
  eventId: string,
  roundId: string,
  matchId: string,
  input: RecordGoalInput,
) {
  const api = await createServerApiClient();
  const { data, error, response } = await api.POST(
    "/api/events/{eventId}/rounds/{roundId}/matches/{matchId}/goals",
    {
      params: { path: { eventId, roundId, matchId } },
      body: input,
    },
  );
  if (error) {
    throw new Error(
      `得点記録に失敗しました (status=${response.status})`,
    );
  }
  return data!;
}

export async function removeGoal(
  eventId: string,
  roundId: string,
  matchId: string,
  goalId: string,
) {
  const api = await createServerApiClient();
  const { error, response } = await api.DELETE(
    "/api/events/{eventId}/rounds/{roundId}/matches/{matchId}/goals/{goalId}",
    { params: { path: { eventId, roundId, matchId, goalId } } },
  );
  if (error || !response.ok) {
    throw new Error(
      `得点取り消しに失敗しました (status=${response.status})`,
    );
  }
}

export async function addSubstitute(
  eventId: string,
  roundId: string,
  matchId: string,
  input: AddSubstituteInput,
) {
  const api = await createServerApiClient();
  const { error, response } = await api.POST(
    "/api/events/{eventId}/rounds/{roundId}/matches/{matchId}/substitutes",
    {
      params: { path: { eventId, roundId, matchId } },
      body: input,
    },
  );
  if (error) {
    throw new Error(
      `助っ人追加に失敗しました (status=${response.status})`,
    );
  }
}

export async function finishMatch(
  eventId: string,
  roundId: string,
  matchId: string,
) {
  const api = await createServerApiClient();
  const { error, response } = await api.POST(
    "/api/events/{eventId}/rounds/{roundId}/matches/{matchId}/finish",
    { params: { path: { eventId, roundId, matchId } } },
  );
  if (error) {
    throw new Error(
      `マッチ終了に失敗しました (status=${response.status})`,
    );
  }
}

export async function reopenMatch(
  eventId: string,
  roundId: string,
  matchId: string,
) {
  const api = await createServerApiClient();
  const { error, response } = await api.POST(
    "/api/events/{eventId}/rounds/{roundId}/matches/{matchId}/reopen",
    { params: { path: { eventId, roundId, matchId } } },
  );
  if (error) {
    throw new Error(
      `マッチ再開に失敗しました (status=${response.status})`,
    );
  }
}
