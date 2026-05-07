import createClient from "openapi-fetch";
import type { paths } from "./schema";

/**
 * OpenAPI スキーマから生成された型付き fetch クライアント。
 *
 * サーバーサイドからは `NEXT_PUBLIC_API_BASE_URL` を参照(Docker 内通信)、
 * クライアントサイドからはブラウザからの到達可能なホストを参照する。
 */
const serverBaseUrl =
  process.env.BACKEND_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://backend:8080";

const browserBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const baseUrl = typeof window === "undefined" ? serverBaseUrl : browserBaseUrl;

export const apiClient = createClient<paths>({ baseUrl });
