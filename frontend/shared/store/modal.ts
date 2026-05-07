import { create } from "zustand";

/**
 * 確認モーダルのストア。
 * 元: src/js.html のカスタムモーダル(confirm の代替)。
 */

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ModalState = {
  open: boolean;
  options: ConfirmOptions | null;
  resolve: ((result: boolean) => void) | null;
  openConfirm: (options: ConfirmOptions) => Promise<boolean>;
  close: (result: boolean) => void;
};

export const useModalStore = create<ModalState>((set, get) => ({
  open: false,
  options: null,
  resolve: null,
  openConfirm: (options) =>
    new Promise<boolean>((resolve) => {
      set({ open: true, options, resolve });
    }),
  close: (result) => {
    const { resolve } = get();
    if (resolve) {
      resolve(result);
    }
    set({ open: false, options: null, resolve: null });
  },
}));

/** フックの外から呼べる簡易 API */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return useModalStore.getState().openConfirm(options);
}
