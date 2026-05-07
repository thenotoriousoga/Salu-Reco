import "server-only";
import { createServerApiClient } from "@/shared/api/client";

/**
 * Event コンテキストの API クライアント(サーバーサイド専用)。
 * クライアント側からは Next.js Route Handler 経由で呼び出す想定。
 */

export type CreateEventInput = {
  name: string;
  date: string; // yyyy-MM-dd
};

export async function listEvents() {
  const api = await createServerApiClient();
  const { data, error, response } = await api.GET("/api/events", {});
  if (error) {
    throw new Error(
      `イベント一覧の取得に失敗しました (status=${response.status})`,
    );
  }
  return data!;
}

export async function getEventDetail(eventId: string) {
  const api = await createServerApiClient();
  const { data, error, response } = await api.GET("/api/events/{id}", {
    params: { path: { id: eventId } },
  });
  if (error) {
    if (response.status === 404) return null;
    throw new Error(
      `イベント詳細の取得に失敗しました (status=${response.status})`,
    );
  }
  return data!;
}

export async function createEvent(input: CreateEventInput) {
  const api = await createServerApiClient();
  const { data, error, response } = await api.POST("/api/events", {
    body: input,
  });
  if (error) {
    throw new Error(`イベント作成に失敗しました (status=${response.status})`);
  }
  return data!;
}

export async function startEvent(eventId: string) {
  const api = await createServerApiClient();
  const { error, response } = await api.POST("/api/events/{id}/start", {
    params: { path: { id: eventId } },
  });
  if (error) {
    throw new Error(`イベント開始に失敗しました (status=${response.status})`);
  }
}

export async function finishEvent(eventId: string) {
  const api = await createServerApiClient();
  const { error, response } = await api.POST("/api/events/{id}/finish", {
    params: { path: { id: eventId } },
  });
  if (error) {
    throw new Error(`イベント終了に失敗しました (status=${response.status})`);
  }
}

export async function reopenEvent(eventId: string) {
  const api = await createServerApiClient();
  const { error, response } = await api.POST("/api/events/{id}/reopen", {
    params: { path: { id: eventId } },
  });
  if (error) {
    throw new Error(`イベント再開に失敗しました (status=${response.status})`);
  }
}
