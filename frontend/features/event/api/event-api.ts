import { apiClient } from "@/shared/api/client";

/**
 * Event コンテキストの API クライアント。
 * Server / Client どちらからも呼び出せる。
 */

export type CreateEventInput = {
  name: string;
  date: string; // yyyy-MM-dd
};

export async function listEvents() {
  const { data, error, response } = await apiClient.GET("/api/events", {});
  if (error) {
    throw new Error(
      `イベント一覧の取得に失敗しました (status=${response.status})`,
    );
  }
  return data!;
}

export async function createEvent(input: CreateEventInput) {
  const { data, error, response } = await apiClient.POST("/api/events", {
    body: input,
  });
  if (error) {
    throw new Error(
      `イベント作成に失敗しました (status=${response.status})`,
    );
  }
  return data!;
}
