"use client";

import { useToastStore } from "@/shared/store/toast";

/**
 * トースト表示コンテナ。layout で一度だけ配置する。
 * 元: src/index.html の <div id="toast"> + src/css.html の .toast。
 */
export function ToastRoot() {
  const message = useToastStore((s) => s.message);
  const kind = useToastStore((s) => s.kind);

  const classes = ["toast", message ? "show" : "", kind === "error" ? "error" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role="alert" aria-live="polite">
      {message ?? ""}
    </div>
  );
}
