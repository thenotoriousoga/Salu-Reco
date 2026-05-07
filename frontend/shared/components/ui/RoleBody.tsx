"use client";

import type { ReactNode } from "react";
import { useRoleStore } from "@/shared/store/role";

type RoleBodyProps = {
  children: ReactNode;
};

/**
 * <body> に role-admin / role-user クラスを付与する。
 * 既存の CSS `body.role-user .admin-only { display:none }` を効かせるため。
 */
export function RoleBody({ children }: RoleBodyProps) {
  const role = useRoleStore((s) => s.role);
  const className = ["min-h-full", "flex", "flex-col", role ? `role-${role}` : ""]
    .filter(Boolean)
    .join(" ");
  return <body className={className}>{children}</body>;
}
