import { redirect } from "next/navigation";
import { getAuthInfo } from "@/shared/lib/auth";
import { RoleSync } from "@/shared/components/ui/RoleSync";

/**
 * イベントルート全体の認証ガード。未ログインなら /login に飛ばす。
 * ログイン済みロールをクライアントストアに同期する。
 */
export default async function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getAuthInfo();
  if (!auth) {
    redirect("/login");
  }
  return (
    <>
      <RoleSync role={auth.role === "ADMIN" ? "admin" : "user"} />
      {children}
    </>
  );
}
