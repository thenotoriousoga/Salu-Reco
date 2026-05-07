import { create } from "zustand";

/**
 * 全画面ローディングオーバーレイのストア。
 * 元: src/js.html の showLoading / hideLoading。
 * 複数箇所から同時呼び出しされる可能性があるのでカウンタで管理する。
 */

type LoadingState = {
  count: number;
  message: string | null;
  sub: string | null;
  show: (message?: string, sub?: string) => void;
  hide: () => void;
};

export const useLoadingStore = create<LoadingState>((set, get) => ({
  count: 0,
  message: null,
  sub: null,
  show: (message, sub) =>
    set({
      count: get().count + 1,
      message: message ?? null,
      sub: sub ?? null,
    }),
  hide: () => {
    const next = Math.max(0, get().count - 1);
    set({
      count: next,
      message: next === 0 ? null : get().message,
      sub: next === 0 ? null : get().sub,
    });
  },
}));
