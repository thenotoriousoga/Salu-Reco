import { create } from "zustand";

/**
 * 現在のロール。
 * Phase 2 で認証基盤が入るまではクライアント側のストアで管理。
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
  role: "admin", // Phase 1.5 時点では UI 確認のためダミーで admin
  setRole: (role) => set({ role }),
}));
