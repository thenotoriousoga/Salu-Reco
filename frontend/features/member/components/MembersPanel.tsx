"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Icon } from "@/shared/icons/ic";
import { confirmDialog } from "@/shared/store/modal";
import { useLoadingStore } from "@/shared/store/loading";
import { toast } from "@/shared/store/toast";
import { MemberEditModal, type EditableMember } from "./MemberEditModal";

type Member = EditableMember;

type QueueItem = {
  key: string;
  name: string;
  seniorityYear: number;
  soccerExperience: "Experienced" | "Inexperienced";
  isOrganizer: boolean;
  note: string;
};

/**
 * メンバー管理パネル(タブ用)。
 * 元: src/index.html の `#tab-members` と js-members.html。
 */
export function MembersPanel({ eventId }: { eventId: string }) {
  const loading = useLoadingStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [name, setName] = useState("");
  const [seniority, setSeniority] = useState(1);
  const [exp, setExp] = useState<"Experienced" | "Inexperienced">("Inexperienced");
  const [organizer, setOrganizer] = useState(false);
  const [noteVisible, setNoteVisible] = useState(false);
  const [note, setNote] = useState("");
  const [editTarget, setEditTarget] = useState<Member | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/members`, { cache: "no-store" });
    if (!res.ok) {
      toast.error("メンバー一覧の取得に失敗しました");
      return;
    }
    const data = (await res.json()) as { members: Member[] };
    setMembers(data.members ?? []);
  }, [eventId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addToQueue = () => {
    if (!name.trim()) {
      toast.error("名前を入力してください");
      return;
    }
    setQueue((q) => [
      ...q,
      {
        key: `${Date.now()}-${q.length}`,
        name: name.trim(),
        seniorityYear: seniority,
        soccerExperience: exp,
        isOrganizer: organizer,
        note: note.trim(),
      },
    ]);
    setName("");
    setSeniority(1);
    setExp("Inexperienced");
    setOrganizer(false);
    setNote("");
    setNoteVisible(false);
  };

  const removeQueueItem = (key: string) => {
    setQueue((q) => q.filter((m) => m.key !== key));
  };

  const registerAll = async () => {
    if (queue.length === 0) return;
    loading.show("一括登録中...");
    try {
      const body = {
        members: queue.map((q) => ({
          name: q.name,
          seniorityYear: q.seniorityYear,
          soccerExperience: q.soccerExperience,
          isOrganizer: q.isOrganizer,
          note: q.note,
        })),
      };
      const res = await fetch(`/api/events/${eventId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`status=${res.status}`);
      setQueue([]);
      toast.info(`${queue.length}名を登録しました`);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      loading.hide();
    }
  };

  const handleDelete = async (member: Member) => {
    const ok = await confirmDialog({
      title: `${member.name} を削除しますか?`,
      message: "このメンバーに紐づくマッチ出場記録も残ったままになります。",
      confirmLabel: "削除する",
      danger: true,
    });
    if (!ok) return;
    loading.show("削除中...");
    try {
      const res = await fetch(`/api/events/${eventId}/members/${member.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`status=${res.status}`);
      toast.info("削除しました");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      loading.hide();
    }
  };

  return (
    <>
      <Card className="admin-only">
        <h3>
          <Icon name="userPlus" size={18} className="section-icon" />
          選手登録
        </h3>

        <div className="member-form-name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="名前を入力"
            className="input input-name"
            aria-label="名前"
          />
        </div>

        <div className="member-form-attrs">
          <div className="attr-item">
            <label htmlFor="m-years" className="attr-label">年次</label>
            <input
              id="m-years"
              type="number"
              min={1}
              max={50}
              value={seniority}
              onChange={(e) => setSeniority(Math.max(1, Number(e.target.value) || 1))}
              className="input attr-input"
            />
          </div>
          <div className="attr-item">
            <label htmlFor="m-exp" className="attr-label">経験</label>
            <select
              id="m-exp"
              value={exp}
              onChange={(e) => setExp(e.target.value as typeof exp)}
              className="input attr-input"
            >
              <option value="Inexperienced">なし</option>
              <option value="Experienced">あり</option>
            </select>
          </div>
          <div className="attr-item">
            <label className="attr-label attr-label-cb">
              <input
                type="checkbox"
                checked={organizer}
                onChange={(e) => setOrganizer(e.target.checked)}
              />
              幹事
            </label>
          </div>
        </div>

        <div className="member-form-note">
          <button
            type="button"
            className="note-toggle"
            onClick={() => setNoteVisible((v) => !v)}
          >
            <Icon name="plus" size={14} />
            <span style={{ marginLeft: 4 }}>備考を追加</span>
          </button>
          {noteVisible ? (
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="初参加、久しぶり、役職など"
                className="input"
                aria-label="備考"
              />
            </div>
          ) : null}
        </div>

        <Button
          variant="secondary"
          size="lg"
          onClick={addToQueue}
          leftIcon={<Icon name="plus" size={18} className="btn-icon" />}
        >
          メンバーに追加!
        </Button>

        {queue.length > 0 ? (
          <div className="mt-md">
            <h4 style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>
              登録待ち({queue.length}人)
            </h4>
            {queue.map((q) => (
              <div
                key={q.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px dashed var(--border-light)",
                }}
              >
                <div style={{ fontSize: "0.9rem" }}>
                  <span style={{ fontWeight: 600 }}>{q.name}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginLeft: 8 }}>
                    {q.seniorityYear}年目 / {q.soccerExperience === "Experienced" ? "経験あり" : "未経験"}
                    {q.isOrganizer ? " / 幹事" : ""}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeQueueItem(q.key)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--danger)",
                    cursor: "pointer",
                    padding: 4,
                  }}
                  aria-label="取り消し"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            ))}
            <Button
              variant="primary"
              size="lg"
              onClick={registerAll}
              leftIcon={<Icon name="check" size={18} className="btn-icon" />}
              className="mt-sm"
            >
              まとめて登録
            </Button>
          </div>
        ) : null}
      </Card>

      <Card>
        <h3>
          <Icon name="users" size={18} className="section-icon" />
          選手一覧
          <span className="member-legend-inline">
            🏢幹事 ⚽経験あり
          </span>
        </h3>
        {members.length === 0 ? (
          <EmptyState
            icon="info"
            title="まだメンバーがいません"
            sub="上のフォームから登録しましょう"
          />
        ) : (
          <ul style={{ listStyle: "none" }}>
            {members.map((m) => (
              <li key={m.id} className="member-item-v2">
                <div className="member-main">
                  <span className="member-name-v2">{m.name}</span>
                  <span className="member-years">({m.seniorityYear}年目)</span>
                  <div className="member-icons">
                    {m.isOrganizer ? <span className="member-icon">🏢</span> : null}
                    {m.soccerExperience === "Experienced" ? <span className="member-icon">⚽</span> : null}
                  </div>
                  <div className="member-delete-btn admin-only">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm member-edit-btn"
                      onClick={() => setEditTarget(m)}
                      aria-label={`${m.name} を編集`}
                    >
                      <Icon name="edit" size={14} className="btn-icon" />
                    </button>
                  </div>
                </div>
                {(m.note || m.enthusiasm) ? (
                  <div className="member-sub">
                    {m.enthusiasm ? <span>💬 {m.enthusiasm}</span> : null}
                    {m.note ? <span style={{ marginLeft: m.enthusiasm ? 8 : 0, color: "var(--text-muted)" }}>{m.note}</span> : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editTarget ? (
        <MemberEditModal
          eventId={eventId}
          member={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={async () => {
            setEditTarget(null);
            await reload();
          }}
          onDeleted={async () => {
            setEditTarget(null);
            await reload();
          }}
        />
      ) : null}
    </>
  );
}
