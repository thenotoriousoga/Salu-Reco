"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { confirmDialog } from "@/shared/store/modal";
import { useLoadingStore } from "@/shared/store/loading";
import { toast } from "@/shared/store/toast";

export type EditableMember = {
  id: string;
  eventId: string;
  name: string;
  seniorityYear: number;
  soccerExperience: "Experienced" | "Inexperienced";
  isOrganizer: boolean;
  note: string;
  enthusiasm: string;
};

type Props = {
  eventId: string;
  member: EditableMember;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
};

/**
 * メンバー編集モーダル。
 * 元: src/index.html の #member-edit-modal。
 */
export function MemberEditModal({ eventId, member, onClose, onUpdated, onDeleted }: Props) {
  const loading = useLoadingStore();
  const [name, setName] = useState(member.name);
  const [seniority, setSeniority] = useState(member.seniorityYear);
  const [exp, setExp] = useState(member.soccerExperience);
  const [organizer, setOrganizer] = useState(member.isOrganizer);
  const [note, setNote] = useState(member.note);
  const [enthusiasm, setEnthusiasm] = useState(member.enthusiasm);

  const save = async () => {
    loading.show("保存中...");
    try {
      const res = await fetch(`/api/events/${eventId}/members/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          seniorityYear: seniority,
          soccerExperience: exp,
          isOrganizer: organizer,
          note,
          enthusiasm,
        }),
      });
      if (!res.ok) throw new Error(`status=${res.status}`);
      toast.info("保存しました");
      await onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      loading.hide();
    }
  };

  const remove = async () => {
    const ok = await confirmDialog({
      title: `${member.name} を削除しますか?`,
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
      await onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      loading.hide();
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-edit-title"
      onClick={onClose}
    >
      <div className="modal-box modal-box-wide" onClick={(e) => e.stopPropagation()}>
        <h3 id="member-edit-title">メンバー編集</h3>
        <div className="member-form-name" style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input input-name"
            aria-label="名前"
          />
        </div>
        <div className="member-form-attrs" style={{ marginBottom: 12 }}>
          <div className="attr-item">
            <label className="attr-label">年次</label>
            <input
              type="number"
              min={1}
              max={50}
              value={seniority}
              onChange={(e) => setSeniority(Math.max(1, Number(e.target.value) || 1))}
              className="input attr-input"
            />
          </div>
          <div className="attr-item">
            <label className="attr-label">経験</label>
            <select
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
        <div style={{ marginBottom: 16 }}>
          <label className="attr-label" style={{ display: "block", marginBottom: 4 }}>
            備考
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="attr-label" style={{ display: "block", marginBottom: 4 }}>
            意気込み(50文字まで)
          </label>
          <input
            type="text"
            value={enthusiasm}
            maxLength={50}
            onChange={(e) => setEnthusiasm(e.target.value)}
            className="input"
            placeholder="今日の意気込みを一言!"
          />
        </div>
        <div className="modal-actions">
          <Button variant="danger" onClick={remove} style={{ marginRight: "auto" }}>
            削除
          </Button>
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="primary" onClick={save}>
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
