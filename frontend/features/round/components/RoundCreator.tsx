"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Icon } from "@/shared/icons/ic";
import { useLoadingStore } from "@/shared/store/loading";
import { toast } from "@/shared/store/toast";

type Member = {
  id: string;
  name: string;
};

type Props = {
  eventId: string;
  onCreated: () => void;
};

/**
 * ラウンド作成（チーム分け実行）コンポーネント。
 * メンバーチェックリスト + チーム数選択 → POST でラウンド作成。
 */
export function RoundCreator({ eventId, onCreated }: Props) {
  const loading = useLoadingStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [teamCount, setTeamCount] = useState(2);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/members`, { cache: "no-store" });
      if (!res.ok) throw new Error(`status=${res.status}`);
      const data = (await res.json()) as { members: Member[] };
      setMembers(data.members ?? []);
      setSelected(new Set((data.members ?? []).map((m: Member) => m.id)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "メンバー取得に失敗しました");
    }
  }, [eventId]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const maxTeams = Math.max(2, Math.floor(selected.size / 3));

  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(members.map((m) => m.id)));
  const deselectAll = () => setSelected(new Set());

  const handleCreate = async () => {
    if (selected.size < 6) {
      toast.error("最低6人以上を選択してください");
      return;
    }

    loading.show("チーム分け実行中...");
    try {
      const res = await fetch(`/api/events/${eventId}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamCount,
          memberIds: Array.from(selected),
        }),
      });
      if (!res.ok) throw new Error(`status=${res.status}`);
      toast.info("チーム分けを実行しました");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "チーム分けに失敗しました");
    } finally {
      loading.hide();
    }
  };

  return (
    <div style={{ padding: "12px 0" }}>
      <h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: 8 }}>
        チーム分け設定
      </h4>

      {/* チーム数セレクター */}
      <div className="recorder-row" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <label htmlFor="team-count" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
          チーム数:
        </label>
        <select
          id="team-count"
          value={teamCount}
          onChange={(e) => setTeamCount(Number(e.target.value))}
          className="input"
          style={{ maxWidth: 80 }}
        >
          {Array.from({ length: maxTeams - 1 }, (_, i) => i + 2).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          ({selected.size}人選択中)
        </span>
      </div>

      {/* メンバーリスト */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            onClick={selectAll}
            style={{ fontSize: "0.75rem", color: "var(--primary)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            全選択
          </button>
          <button
            type="button"
            onClick={deselectAll}
            style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            全解除
          </button>
        </div>
        <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--border-light)", borderRadius: "var(--radius-sm)", padding: 8 }}>
          {members.map((m) => (
            <label
              key={m.id}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", cursor: "pointer", fontSize: "0.85rem" }}
            >
              <input
                type="checkbox"
                checked={selected.has(m.id)}
                onChange={() => toggleMember(m.id)}
                style={{ accentColor: "var(--primary)" }}
              />
              {m.name}
            </label>
          ))}
        </div>
      </div>

      <Button
        variant="primary"
        size="lg"
        onClick={handleCreate}
        disabled={selected.size < 6}
        leftIcon={<Icon name="play" size={18} className="btn-icon" />}
      >
        チーム分け実行
      </Button>
    </div>
  );
}
