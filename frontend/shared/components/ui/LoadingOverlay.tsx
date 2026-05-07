"use client";

import { useLoadingStore } from "@/shared/store/loading";

/**
 * 全画面ローディングオーバーレイ。layout に一度だけ配置する。
 * 元: src/index.html の <div id="loading"> + src/css.html の .loading。
 */
export function LoadingOverlay() {
  const count = useLoadingStore((s) => s.count);
  const message = useLoadingStore((s) => s.message);
  const sub = useLoadingStore((s) => s.sub);

  if (count === 0) {
    return null;
  }

  return (
    <div className="loading" role="status" aria-label="読み込み中">
      <div className="loading-content">
        <div className="spinner" />
        {message ? <p>{message}</p> : null}
        {sub ? <p className="loading-sub">{sub}</p> : null}
      </div>
    </div>
  );
}
