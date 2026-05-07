import { redirect } from "next/navigation";

/**
 * ルート(/)はイベント一覧へリダイレクトする。
 */
export default function Home() {
  redirect("/events");
}
