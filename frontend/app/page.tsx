import { redirect } from "next/navigation";
import { getAuthInfo } from "@/shared/lib/auth";

/**
 * ルート (/) はロールに応じてリダイレクト。
 * 未ログインならログイン画面へ、ログイン済みならイベント一覧へ。
 */
export default async function Home() {
  const auth = await getAuthInfo();
  redirect(auth ? "/events" : "/login");
}
