import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { getAuthInfo } from "@/shared/lib/auth";

/**
 * ログイン画面。
 * 既にログイン済みならイベント一覧にリダイレクトする。
 */
export default async function LoginPage() {
  const auth = await getAuthInfo();
  if (auth) {
    redirect("/events");
  }
  return <LoginForm />;
}
