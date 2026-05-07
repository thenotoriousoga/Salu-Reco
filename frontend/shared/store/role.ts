import { create } from "zustand";

/**
 * 現在のロール。
 * 実ロールは Server Component で取得した値をレイアウトから `RoleSync` で流し込む。
 * - "admin": 管理者モード (全イベント操作可)
 * - "user":  参加者モード (イベント内のみ閲覧・限定操作)
 * - null:    未ログイン (ログイン画面だけが表示される状態)
 */
export type Role = "admin" | "user" | null;

type RoleState = {
  role: Role;
  setRole: (role: Role) => void;
};

export const useRoleStore = create<RoleState>((set) => ({
  role: null,
  setRole: (role) => set({ role }),
}));
