"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Icon } from "@/shared/icons/ic";
import { useLoadingStore } from "@/shared/store/loading";
import { confirmDialog } from "@/shared/store/modal";
import { toast } from "@/shared/store/toast";
import { Badge } from "@/shared/components/ui/Badge";
import { MatchCard } from "@/features/match/components/MatchCard";
import { MatchCreator } from "@/features/match/components/MatchCreator";
import { RoundCreator } from "./RoundCreator";
import { TeamDisplay } from "./TeamDisplay";

type Round = {
  id: string;
  roundNumber: number;
  status: "InProgress" | "Finished";
  teamCount: number;
  matchCount: number;
};

type TeamResponse = {
  name: string;
  memberIds: string[];
  captainId?: string | null;
};

type RoundDetail = {
  id: string;
  eventId: string;
  roundNumber: number;
  status: "InProgress" | "Finished";
  teamAssignment: {
    teams: TeamResponse[];
  };
};

type MatchListItem = {
  id: string;
  matchNumber: number;
  teamAName: string;
  teamBName: string;
  status: "InProgress" | "Finished";
  scoreA: number;
  scoreB: number;
};

type Props = {
  eventId: string;
};

/**
 * 試合タブのメインパネル。
 * ラウンド一覧を取得し、最新ラウンドの詳細とマッチ一覧を表示する。
 */
export function MatchesPanel({ eventId }: Props) {
  const loading = useLoadingStore();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [roundDetail, setRoundDetail] = useState<RoundDetail | null>(null);
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [memberNames, setMemberNames] = useState<Map<string, string>>(new Map());

  // メンバー名マップを取得
  const loadMemberNames = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/members`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { members: { id: string; name: string }[] };
      const map = new Map<string, string>();
      for (const m of data.members ?? []) {
        map.set(m.id, m.name);
      }
      setMemberNames(map);
    } catch {
      // サイレントに無視
    }
  }, [eventId]);

  // ラウンド一覧取得
  const loadRounds = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/rounds`, { cache: "no-store" });
      if (!res.ok) throw new Error(`status=${res.status}`);
      const data = (await res.json()) as { rounds: Round[] };
      const list = data.rounds ?? [];
      setRounds(list);
      // 最新ラウンドをアクティブにする
      if (list.length > 0) {
        const latest = list[list.length - 1];
        setActiveRoundId(latest.id);
      } else {
        setActiveRoundId(null);
        setRoundDetail(null);
        setMatches([]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ラウンド一覧の取得に失敗しました");
    }
  }, [eventId]);

  // ラウンド詳細取得
  const loadRoundDetail = useCallback(async (roundId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/rounds/${roundId}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`status=${res.status}`);
      const data = (await res.json()) as RoundDetail;
      setRoundDetail(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ラウンド詳細の取得に失敗しました");
    }
  }, [eventId]);

  // マッチ一覧取得
  const loadMatches = useCallback(async (roundId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/rounds/${roundId}/matches`, { cache: "no-store" });
      if (!res.ok) throw new Error(`status=${res.status}`);
      const data = (await res.json()) as { matches: MatchListItem[] };
      setMatches(data.matches ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "マッチ一覧の取得に失敗しました");
    }
  }, [eventId]);

  useEffect(() => {
    void loadRounds();
    void loadMemberNames();
  }, [loadRounds, loadMemberNames]);

  useEffect(() => {
    if (activeRoundId) {
      void loadRoundDetail(activeRoundId);
      void loadMatches(activeRoundId);
    }
  }, [activeRoundId, loadRoundDetail, loadMatches]);

  const refreshCurrent = async () => {
    if (activeRoundId) {
      await loadRoundDetail(activeRoundId);
      await loadMatches(activeRoundId);
    }
  };

  const handleFinishRound = async () => {
    if (!activeRoundId) return;
    const ok = await confirmDialog({
      title: "このラウンドを終了しますか？",
      confirmLabel: "終了する",
    });
    if (!ok) return;

    loading.show("ラウンド終了中...");
    try {
      const res = await fetch(
        `/api/events/${eventId}/rounds/${activeRoundId}/finish`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`status=${res.status}`);
      toast.info("ラウンドを終了しました");
      await loadRounds();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "終了に失敗しました");
    } finally {
      loading.hide();
    }
  };

  const handleReopenRound = async () => {
    if (!activeRoundId) return;
    loading.show("ラウンド再開中...");
    try {
      const res = await fetch(
        `/api/events/${eventId}/rounds/${activeRoundId}/reopen`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`status=${res.status}`);
      toast.info("ラウンドを再開しました");
      await loadRounds();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "再開に失敗しました");
    } finally {
      loading.hide();
    }
  };

  // ラウンドがない場合
  if (rounds.length === 0 && !showCreator) {
    return (
      <Card>
        <EmptyState
          icon="whistle"
          title="まだラウンドがありません"
          sub="チーム分けを実行して試合を始めましょう"
          action={
            <Button
              variant="primary"
              className="admin-only"
              onClick={() => setShowCreator(true)}
              leftIcon={<Icon name="play" size={16} className="btn-icon" />}
            >
              チーム分け実行
            </Button>
          }
        />
      </Card>
    );
  }

  // ラウンド作成画面
  if (showCreator) {
    return (
      <Card className="admin-only">
        <RoundCreator
          eventId={eventId}
          onCreated={async () => {
            setShowCreator(false);
            await loadRounds();
            await loadMemberNames();
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowCreator(false)}
          style={{ marginTop: 8 }}
        >
          キャンセル
        </Button>
      </Card>
    );
  }

  return (
    <>
      {/* ラウンドヘッダー */}
      {roundDetail ? (
        <Card>
          <div className="round-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ margin: 0 }}>
                <Icon name="flag" size={16} className="section-icon" />
                Round {roundDetail.roundNumber}
              </h3>
              <Badge variant={roundDetail.status === "InProgress" ? "ongoing" : "ended"}>
                {roundDetail.status === "InProgress" ? "進行中" : "終了"}
              </Badge>
            </div>
            <div className="admin-only" style={{ display: "flex", gap: 8 }}>
              {roundDetail.status === "InProgress" ? (
                <Button variant="danger" size="sm" onClick={handleFinishRound}>
                  終了
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={handleReopenRound}>
                  再開
                </Button>
              )}
            </div>
          </div>

          {/* チーム分け結果 */}
          <TeamDisplay
            teams={roundDetail.teamAssignment.teams}
            memberNames={memberNames}
          />

          {/* 3チーム以上ならマッチ作成UI */}
          {roundDetail.teamAssignment.teams.length > 2 && roundDetail.status === "InProgress" ? (
            <MatchCreator
              eventId={eventId}
              roundId={roundDetail.id}
              teams={roundDetail.teamAssignment.teams}
              onCreated={refreshCurrent}
            />
          ) : null}
        </Card>
      ) : null}

      {/* マッチ一覧 */}
      {matches.length > 0 ? (
        <Card>
          <h3>
            <Icon name="goal" size={16} className="section-icon" />
            試合一覧
          </h3>
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              eventId={eventId}
              roundId={activeRoundId!}
              onUpdate={refreshCurrent}
            />
          ))}
        </Card>
      ) : (
        activeRoundId && roundDetail ? (
          <Card>
            <EmptyState
              icon="whistle"
              title="まだ試合がありません"
              sub={roundDetail.teamAssignment.teams.length === 2
                ? "2チーム構成のため自動的に試合が作成されます"
                : "上のチーム選択から試合を作成してください"}
            />
          </Card>
        ) : null
      )}

      {/* ラウンドナビゲーション（複数ラウンドの場合） */}
      {rounds.length > 1 ? (
        <Card>
          <h3 style={{ fontSize: "0.85rem" }}>ラウンド切替</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {rounds.map((r) => (
              <Button
                key={r.id}
                variant={r.id === activeRoundId ? "primary" : "secondary"}
                size="sm"
                onClick={() => setActiveRoundId(r.id)}
              >
                R{r.roundNumber}
              </Button>
            ))}
          </div>
        </Card>
      ) : null}

      {/* 新しいラウンドを作成 */}
      <div className="admin-only" style={{ textAlign: "center", marginTop: 8 }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowCreator(true)}
          leftIcon={<Icon name="plus" size={14} className="btn-icon" />}
        >
          新しいラウンドを作成
        </Button>
      </div>
    </>
  );
}
