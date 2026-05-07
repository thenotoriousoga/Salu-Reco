import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Icon } from "@/shared/icons/ic";
import { getEventDetail } from "@/features/event/api/event-api";
import { EventStatusControls } from "@/features/event/components/EventStatusControls";
import { JoinCodeBlock } from "@/features/event/components/JoinCodeBlock";

type EventStatus = "Preparing" | "InProgress" | "Finished";

const STATUS_BADGE: Record<EventStatus, { variant: "preparing" | "ongoing" | "ended"; label: string }> = {
  Preparing: { variant: "preparing", label: "準備中" },
  InProgress: { variant: "ongoing", label: "進行中" },
  Finished: { variant: "ended", label: "終了" },
};

export const dynamic = "force-dynamic";

/**
 * イベント詳細ページ(Server Component)。
 * Phase 3 時点では Event 集約情報+参加コードコピー+QRコード+ステータス遷移のみ。
 * メンバー/ラウンド/MVP は Phase 4 以降で追加する。
 */
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventDetail(id);
  if (!event) {
    notFound();
  }

  const status = STATUS_BADGE[event.status as EventStatus] ?? STATUS_BADGE.Preparing;

  return (
    <>
      <Card>
        <div className="admin-only" style={{ marginBottom: 12 }}>
          <Link href="/events" style={{ textDecoration: "none" }}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Icon name="arrowLeft" size={14} className="btn-icon" />}
            >
              一覧に戻る
            </Button>
          </Link>
        </div>

        <h2>{event.name}</h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            color: "var(--text-muted)",
            fontFamily: "var(--font-fira-code), monospace",
            fontSize: "0.85rem",
          }}
        >
          <span>{event.date}</span>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div style={{ marginTop: 16 }}>
          <EventStatusControls
            eventId={event.id}
            status={event.status as EventStatus}
          />
        </div>
      </Card>

      <Card>
        <h3>
          <Icon name="play" size={18} className="section-icon" />
          参加コード
        </h3>
        <JoinCodeBlock joinCode={event.joinCode} />
      </Card>

      <Card>
        <h3>
          <Icon name="info" size={18} className="section-icon" />
          このイベントについて
        </h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.7 }}>
          メンバー管理 / 試合管理 / 結果 / MVP 選出は後続フェーズで実装します。
          このページではイベント基本情報と参加コード、ステータス遷移のみ操作できます。
        </p>
      </Card>
    </>
  );
}
