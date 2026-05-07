"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/Button";
import { Icon } from "@/shared/icons/ic";
import { confirmDialog } from "@/shared/store/modal";
import { useLoadingStore } from "@/shared/store/loading";
import { toast } from "@/shared/store/toast";

type EventStatus = "Preparing" | "InProgress" | "Finished";

type EventStatusControlsProps = {
  eventId: string;
  status: EventStatus;
};

/**
 * イベントのステータス遷移操作 UI。admin-only。
 * Phase 3 時点ではメンバー数やラウンド数の実データに依存しない固定Adapterを使う。
 */
export function EventStatusControls({ eventId, status }: EventStatusControlsProps) {
  const router = useRouter();
  const loading = useLoadingStore();

  const callAction = async (action: "start" | "finish" | "reopen", label: string) => {
    loading.show(`${label}...`);
    try {
      const res = await fetch(`/api/events/${eventId}/${action}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message ?? `${label}に失敗しました (${res.status})`);
      }
      toast.info(`${label}しました`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      loading.hide();
    }
  };

  return (
    <div className="admin-only" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {status === "Preparing" ? (
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Icon name="play" size={14} className="btn-icon" />}
          onClick={() => callAction("start", "進行中にする")}
        >
          進行中にする
        </Button>
      ) : null}

      {status === "InProgress" ? (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Icon name="flag" size={14} className="btn-icon" />}
          onClick={async () => {
            const ok = await confirmDialog({
              title: "イベントを終了しますか?",
              message: "終了すると MVP 選出が可能になります。後から再開することもできます。",
              confirmLabel: "終了する",
            });
            if (ok) void callAction("finish", "イベントを終了");
          }}
        >
          イベントを終了
        </Button>
      ) : null}

      {status === "Finished" ? (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Icon name="arrowLeft" size={14} className="btn-icon" />}
          onClick={() => callAction("reopen", "進行中に戻す")}
        >
          進行中に戻す
        </Button>
      ) : null}
    </div>
  );
}
