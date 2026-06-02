"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Icon } from "@/shared/icons/ic";
import { useLoadingStore } from "@/shared/store/loading";
import { toast } from "@/shared/store/toast";

type TeamResponse = {
  name: string;
  memberIds: string[];
  captainId?: string | null;
};

type Props = {
  eventId: string;
  roundId: string;
  teams: TeamResponse[];
  onCreated: () => void;
};

/**
 * マッチ作成コンポーネント（3チーム以上の場合に使用）。
 * 2チームを選択して対戦カードを作成する。
 */
export function MatchCreator({ eventId, roundId, teams, onCreated }: Props) {
  const loading = useLoadingStore();
  const [picked, setPicked] = useState<string[]>([]);

  const togglePick = (name: string) => {
    setPicked((prev) => {
      if (prev.includes(name)) {
        return prev.filter((n) => n !== name);
      }
      if (prev.length >= 2) {
        return [prev[1], name];
      }
      return [...prev, name];
    });
  };

  const handleCreate = async () => {
    if (picked.length !== 2) {
      toast.error("2チームを選択してください");
      return;
    }

    const teamA = teams.find((t) => t.name === picked[0]);
    const teamB = teams.find((t) => t.name === picked[1]);
    if (!teamA || !teamB) return;

    const participants = [
      ...teamA.memberIds.map((id) => ({ memberId: id, team: "A" as const })),
      ...teamB.memberIds.map((id) => ({ memberId: id, team: "B" as const })),
    ];

    loading.show("マッチ作成中...");
    try {
      const res = await fetch(
        `/api/events/${eventId}/rounds/${roundId}/matches`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamAName: teamA.name,
            teamBName: teamB.name,
            participants,
          }),
        },
      );
      if (!res.ok) throw new Error(`status=${res.status}`);
      toast.info("試合を作成しました");
      setPicked([]);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      loading.hide();
    }
  };

  return (
    <div className="match-creator admin-only">
      <h4 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 8 }}>
        試合を作成
      </h4>
      <div className="team-pick">
        {teams.map((team) => (
          <button
            key={team.name}
            type="button"
            className={`team-pick-btn ${picked.includes(team.name) ? "picked" : ""}`}
            onClick={() => togglePick(team.name)}
          >
            {team.name}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <Button
          variant="primary"
          size="sm"
          onClick={handleCreate}
          disabled={picked.length !== 2}
          leftIcon={<Icon name="play" size={14} className="btn-icon" />}
        >
          試合開始
        </Button>
      </div>
    </div>
  );
}
