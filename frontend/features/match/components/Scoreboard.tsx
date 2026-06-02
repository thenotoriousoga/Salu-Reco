"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Icon } from "@/shared/icons/ic";
import { useLoadingStore } from "@/shared/store/loading";
import { confirmDialog } from "@/shared/store/modal";
import { toast } from "@/shared/store/toast";
import { GoalRecorder } from "./GoalRecorder";

type Participant = {
  memberId: string;
  memberName: string;
  team: "A" | "B";
  isSubstitute: boolean;
};

type Goal = {
  id: string;
  team: "A" | "B";
  scorerMemberId?: string | null;
  scorerName?: string | null;
  type: "Normal" | "OwnGoal" | "Unknown";
};

type MatchDetail = {
  id: string;
  roundId: string;
  matchNumber: number;
  teamAName: string;
  teamBName: string;
  status: "InProgress" | "Finished";
  scoreA: number;
  scoreB: number;
  participants: Participant[];
  goals: Goal[];
};

type Props = {
  eventId: string;
  roundId: string;
  matchId: string;
  onUpdate: () => void;
};

/**
 * スコアボード。マッチ詳細を表示し、得点記録・取り消し・終了/再開を行う。
 */
export function Scoreboard({ eventId, roundId, matchId, onUpdate }: Props) {
  const loading = useLoadingStore();
  const [detail, setDetail] = useState<MatchDetail | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/events/${eventId}/rounds/${roundId}/matches/${matchId}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`status=${res.status}`);
      const data = (await res.json()) as MatchDetail;
      setDetail(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "マッチ詳細の取得に失敗しました");
    }
  }, [eventId, roundId, matchId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleRemoveGoal = async (goalId: string) => {
    const ok = await confirmDialog({
      title: "得点を取り消しますか？",
      confirmLabel: "取り消す",
      danger: true,
    });
    if (!ok) return;

    loading.show("取り消し中...");
    try {
      const res = await fetch(
        `/api/events/${eventId}/rounds/${roundId}/matches/${matchId}/goals/${goalId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`status=${res.status}`);
      toast.info("得点を取り消しました");
      await reload();
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "取り消しに失敗しました");
    } finally {
      loading.hide();
    }
  };

  const handleFinish = async () => {
    const ok = await confirmDialog({
      title: "この試合を終了しますか？",
      confirmLabel: "終了する",
    });
    if (!ok) return;

    loading.show("試合終了中...");
    try {
      const res = await fetch(
        `/api/events/${eventId}/rounds/${roundId}/matches/${matchId}/finish`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`status=${res.status}`);
      toast.info("試合を終了しました");
      await reload();
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "終了に失敗しました");
    } finally {
      loading.hide();
    }
  };

  const handleReopen = async () => {
    loading.show("試合再開中...");
    try {
      const res = await fetch(
        `/api/events/${eventId}/rounds/${roundId}/matches/${matchId}/reopen`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`status=${res.status}`);
      toast.info("試合を再開しました");
      await reload();
      onUpdate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "再開に失敗しました");
    } finally {
      loading.hide();
    }
  };

  if (!detail) return null;

  const goalTypeLabel = (type: Goal["type"]) => {
    switch (type) {
      case "Normal": return "";
      case "OwnGoal": return "OG";
      case "Unknown": return "不明";
    }
  };

  return (
    <div className="scoreboard">
      {/* スコア表示 */}
      <div className="score-display">
        <span className="team-name">{detail.teamAName}</span>
        <span className="score">{detail.scoreA}</span>
        <span className="score-separator">-</span>
        <span className="score">{detail.scoreB}</span>
        <span className="team-name">{detail.teamBName}</span>
      </div>

      {/* 管理者用: 試合終了/再開ボタン */}
      <div className="admin-only" style={{ marginBottom: 12 }}>
        {detail.status === "InProgress" ? (
          <Button variant="primary" size="sm" onClick={handleFinish}>
            <Icon name="flag" size={14} className="btn-icon" />
            試合終了
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={handleReopen}>
            再開
          </Button>
        )}
      </div>

      {/* 得点履歴 */}
      {detail.goals.length > 0 ? (
        <div className="goal-list">
          <h4 style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: 6, textAlign: "left" }}>
            得点履歴
          </h4>
          {detail.goals.map((goal) => (
            <div key={goal.id} className="goal-item">
              <div className="goal-info">
                <span style={{ fontWeight: 600, color: goal.team === "A" ? "var(--team-a)" : "var(--team-b)" }}>
                  {goal.team === "A" ? detail.teamAName : detail.teamBName}
                </span>
                <span>{goal.scorerName ?? "不明"}</span>
                {goal.type !== "Normal" ? (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    ({goalTypeLabel(goal.type)})
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                className="admin-only"
                onClick={() => handleRemoveGoal(goal.id)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--danger)",
                  cursor: "pointer",
                  padding: 4,
                }}
                aria-label="得点取り消し"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* 管理者用: 得点記録 */}
      {detail.status === "InProgress" ? (
        <GoalRecorder
          eventId={eventId}
          roundId={roundId}
          matchId={matchId}
          participants={detail.participants}
          onRecorded={async () => {
            await reload();
            onUpdate();
          }}
        />
      ) : null}
    </div>
  );
}
