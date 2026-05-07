"use client";

import { useEffect } from "react";
import { useRoleStore, type Role } from "@/shared/store/role";

/**
 * サーバー側で取得した認証状態を Zustand のロールストアに反映するブリッジ。
 * レイアウト(サーバーコンポーネント)から呼び出す。
 */
export function RoleSync({ role }: { role: Role }) {
  const setRole = useRoleStore((s) => s.setRole);
  useEffect(() => {
    setRole(role);
  }, [role, setRole]);
  return null;
}
