"use client";

import { useRouter } from "next/navigation";
import { useRoleStore } from "@/shared/store/role";
import { BrandLogo, BrandMic } from "./BrandLogo";
import { Icon } from "@/shared/icons/ic";

/**
 * アプリ共通ヘッダー。
 * 元: src/index.html の <header class="header">。
 * ログアウトボタンはロール未設定時は非表示。
 */
export function AppHeader() {
  const router = useRouter();
  const role = useRoleStore((s) => s.role);
  const setRole = useRoleStore((s) => s.setRole);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore: Cookie が消えていれば十分
    }
    setRole(null);
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="header">
      <div className="header-inner">
        <h1>
          <BrandLogo className="header-logo" />
          SALU-REC
          <BrandMic className="header-mic" />
        </h1>
        {role ? (
          <button
            type="button"
            className="btn-logout"
            onClick={handleLogout}
            aria-label="ログアウト"
          >
            <Icon name="logout" size={18} />
          </button>
        ) : null}
      </div>
    </header>
  );
}
