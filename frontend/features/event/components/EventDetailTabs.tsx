"use client";

import { type ReactNode, useState } from "react";

type Tab = "members" | "matches" | "results";

type Props = {
  eventId: string;
  membersPanel: ReactNode;
  matchesPanel?: ReactNode;
  resultsPanel?: ReactNode;
};

/**
 * イベント詳細のタブバー。元: src/index.html の #event-detail-view 内 .tab-bar。
 * 各タブのコンテンツは App 層から props で受け取る（Feature 間の直接依存を避ける）。
 */
export function EventDetailTabs({
  membersPanel,
  matchesPanel,
  resultsPanel,
}: Props) {
  const [active, setActive] = useState<Tab>("members");

  return (
    <>
      <div className="tab-bar" role="tablist">
        <button
          role="tab"
          aria-selected={active === "members"}
          className={`tab-btn ${active === "members" ? "active" : ""}`}
          onClick={() => setActive("members")}
        >
          メンバー
        </button>
        <button
          role="tab"
          aria-selected={active === "matches"}
          className={`tab-btn ${active === "matches" ? "active" : ""}`}
          onClick={() => setActive("matches")}
        >
          試合
        </button>
        <button
          role="tab"
          aria-selected={active === "results"}
          className={`tab-btn ${active === "results" ? "active" : ""}`}
          onClick={() => setActive("results")}
        >
          結果
        </button>
      </div>

      {active === "members" ? membersPanel : null}
      {active === "matches"
        ? (matchesPanel ?? (
            <div className="empty-state">
              <p>試合機能は Phase 5 で実装予定です</p>
            </div>
          ))
        : null}
      {active === "results"
        ? (resultsPanel ?? (
            <div className="empty-state">
              <p>結果・MVP 機能は Phase 6 で実装予定です</p>
            </div>
          ))
        : null}
    </>
  );
}
