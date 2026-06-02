"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { useLoadingStore } from "@/shared/store/loading";
import { toast } from "@/shared/store/toast";

type Participant = {
  memberId: string;
  memberName: string;
  team: "A" | "B";
  isSubstitute: boolean;
};

type GoalType = "Normal" | "OwnGoal" | "Unknown";

type Props = {
  eventId: string;
  roundId: string;
  matchId: string;
  participants: Participant[];
  onRecorded: () => void;
};

/**
 * 得点記録コンポーネント。
 * チーム選択 → 得点タイプ選択 → 得点者選択 → 記録の流れ。
 */
export function GoalRecorder({ eventId, roundId, matchId, participants, onRecorded }: Props) {
  const loading = useLoadingStore();
  const [selectedTeam, setSelectedTeam] = useState<"A" | "B" | null>(null);
  const [goalType, setGoalType] = useState<GoalType>("Normal");
  const [scorerId, setScorerId] = useState<string>("");

  const teamMembers = selectedTeam
    ? participants.filter((p) => p.team === selectedTeam)
    : [];

  const handleRecord = async () => {
    if (!selectedTeam) {
      toast.error("チームを選択してください");
      return;
    }
    if (goalType === "Normal" && !scorerId) {
      toast.error("得点者を選択してください");
      return;
    }

    loading.show("得点記録中...");
    try {
      const res = await fetch(
        `/api/events/${eventId}/rounds/${roundId}/matches/${matchId}/goals`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            team: selectedTeam,
            type: goalType,
            scorerMemberId: goalType === "Normal" ? scorerId : null,
          }),
        },
      );
      if (!res.ok) throw new Error(`status=${res.status}`);
      toast.info("得点を記録しました");
      setSelectedTeam(null);
      setGoalType("Normal");
      setScorerId("");
      onRecorded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "記録に失敗しました");
    } finally {
      loading.hide();
    }
  };

  return (
    <div className="goal-recorder admin-only">
      <h4 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 8 }}>得点記録</h4>

      {/* チーム選択 */}
      <div className="recorder-row team-selector">
        <button
          type="button"
          className={selectedTeam === "A" ? "selected-a" : ""}
          onClick={() => { setSelectedTeam("A"); setScorerId(""); }}
        >
          Team A
        </button>
        <button
          type="button"
          className={selectedTeam === "B" ? "selected-b" : ""}
          onClick={() => { setSelectedTeam("B"); setScorerId(""); }}
        >
          Team B
        </button>
      </div>

      {/* 得点タイプ選択 */}
      <div className="recorder-row">
        <select
          value={goalType}
          onChange={(e) => { setGoalType(e.target.value as GoalType); setScorerId(""); }}
          className="input"
          style={{ maxWidth: 160 }}
          aria-label="得点タイプ"
        >
          <option value="Normal">通常ゴール</option>
          <option value="OwnGoal">オウンゴール</option>
          <option value="Unknown">不明</option>
        </select>
      </div>

      {/* 得点者選択（Normal の場合のみ） */}
      {goalType === "Normal" && selectedTeam ? (
        <div className="recorder-row">
          <select
            value={scorerId}
            onChange={(e) => setScorerId(e.target.value)}
            className="input"
            aria-label="得点者"
          >
            <option value="">得点者を選択</option>
            {teamMembers.map((p) => (
              <option key={p.memberId} value={p.memberId}>
                {p.memberName}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <Button
        variant="accent"
        size="sm"
        onClick={handleRecord}
        disabled={!selectedTeam}
      >
        記録
      </Button>
    </div>
  );
}
