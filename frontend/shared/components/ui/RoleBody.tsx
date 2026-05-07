"use client";

import type { ReactNode } from "react";
import { useRoleStore } from "@/shared/store/role";

type RoleBodyProps = {
  children: ReactNode;
};

/**
 * <body> に role-admin / role-user クラスを付与する。
 * 既存の CSS `body.role-user .admin-only { display:none }` を効かせるため。
 *
 * 注意: GAS 版の body は block 要素として設計されているので、ここで
 * flex レイアウトを付けてはいけない。`.content` の `margin: 0 auto` による
 * 中央寄せが効かなくなり、カードが左寄せになって見た目が崩れる。
 */
export function RoleBody({ children }: RoleBodyProps) {
  const role = useRoleStore((s) => s.role);
  const className = role ? `role-${role}` : "";
  return <body className={className}>{children}</body>;
}
