"use client";

import { useState } from "react";
import { MembersPanel } from "@/features/member/components/MembersPanel";

type Tab = "members" | "matches" | "results";

type Props = {
  eventId: string;
};

/**
 * イベント詳細のタブバー。元: src/index.html の #event-detail-view 内 .tab-bar。
 * matches / results は Phase 5/6 で中身を入れる(現時点はプレースホルダ)。
 */
export function EventDetailTabs({ eventId }: Props) {
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

      {active === "members" ? <MembersPanel eventId={eventId} /> : null}
      {active === "matches" ? (
        <div className="empty-state">
          <p>試合機能は Phase 5 で実装予定です</p>
        </div>
      ) : null}
      {active === "results" ? (
        <div className="empty-state">
          <p>結果・MVP 機能は Phase 6 で実装予定です</p>
        </div>
      ) : null}
    </>
  );
}
