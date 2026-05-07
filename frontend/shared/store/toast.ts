import { create } from "zustand";

/**
 * トースト通知のストア。
 * 元: src/js.html の `showToast(msg, err)`。
 * 同時に1つまで表示、2.5秒で自動的に消える。
 */

export type ToastKind = "info" | "error";

type ToastState = {
  message: string | null;
  kind: ToastKind;
  show: (message: string, kind?: ToastKind) => void;
  hide: () => void;
};

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  kind: "info",
  show: (message, kind = "info") => {
    if (hideTimer) {
      clearTimeout(hideTimer);
    }
    set({ message, kind });
    hideTimer = setTimeout(() => set({ message: null }), 2500);
  },
  hide: () => {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    set({ message: null });
  },
}));

/** 便利関数(フックの外からも呼べる) */
export const toast = {
  info: (msg: string) => useToastStore.getState().show(msg, "info"),
  error: (msg: string) => useToastStore.getState().show(msg, "error"),
};
