import "server-only";
import { createServerApiClient } from "@/shared/api/client";
import type { components } from "@/shared/api/schema";

/**
 * Round コンテキストの API クライアント(サーバーサイド専用)。
 */

/** OpenAPI スキーマから導出したラウンド作成リクエスト型 */
export type CreateRoundInput = components["schemas"]["CreateRoundRequest"];

export async function listRounds(eventId: string) {
  const api = await createServerApiClient();
  const { data, response } = await api.GET(
    "/api/events/{eventId}/rounds",
    { params: { path: { eventId } } },
  );
  if (!response.ok) {
    throw new Error(
      `ラウンド一覧の取得に失敗しました (status=${response.status})`,
    );
  }
  return data!;
}

export async function getRoundDetail(eventId: string, roundId: string) {
  const api = await createServerApiClient();
  const { data, error, response } = await api.GET(
    "/api/events/{eventId}/rounds/{roundId}",
    { params: { path: { eventId, roundId } } },
  );
  if (error) {
    throw new Error(
      `ラウンド詳細の取得に失敗しました (status=${response.status})`,
    );
  }
  return data!;
}

export async function createRound(
  eventId: string,
  input: CreateRoundInput,
) {
  const api = await createServerApiClient();
  const { data, error, response } = await api.POST(
    "/api/events/{eventId}/rounds",
    {
      params: { path: { eventId } },
      body: input,
    },
  );
  if (error) {
    throw new Error(
      `ラウンド作成に失敗しました (status=${response.status})`,
    );
  }
  return data!;
}

export async function finishRound(eventId: string, roundId: string) {
  const api = await createServerApiClient();
  const { error, response } = await api.POST(
    "/api/events/{eventId}/rounds/{roundId}/finish",
    { params: { path: { eventId, roundId } } },
  );
  if (error) {
    throw new Error(
      `ラウンド終了に失敗しました (status=${response.status})`,
    );
  }
}

export async function reopenRound(eventId: string, roundId: string) {
  const api = await createServerApiClient();
  const { error, response } = await api.POST(
    "/api/events/{eventId}/rounds/{roundId}/reopen",
    { params: { path: { eventId, roundId } } },
  );
  if (error) {
    throw new Error(
      `ラウンド再開に失敗しました (status=${response.status})`,
    );
  }
}
