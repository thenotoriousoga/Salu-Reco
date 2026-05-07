"use client";

import { useEffect } from "react";
import { useModalStore } from "@/shared/store/modal";
import { Button } from "./Button";

/**
 * 確認モーダルのルート。layout に一度だけ配置する。
 * 元: src/js.html のカスタムモーダル(confirm の代替) + src/css.html の .modal-*。
 */
export function ModalRoot() {
  const open = useModalStore((s) => s.open);
  const options = useModalStore((s) => s.options);
  const close = useModalStore((s) => s.close);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open || !options) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={() => close(false)}
    >
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 id="modal-title">{options.title}</h3>
        {options.message ? <p>{options.message}</p> : null}
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => close(false)}>
            {options.cancelLabel ?? "キャンセル"}
          </Button>
          <Button
            variant={options.danger ? "danger" : "primary"}
            onClick={() => close(true)}
            autoFocus
          >
            {options.confirmLabel ?? "OK"}
          </Button>
        </div>
      </div>
    </div>
  );
}
