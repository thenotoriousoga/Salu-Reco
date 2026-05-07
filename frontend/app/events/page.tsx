import Link from "next/link";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Icon } from "@/shared/icons/ic";
import { listEvents } from "@/features/event/api/event-api";

export const dynamic = "force-dynamic";

type Status = "Preparing" | "InProgress" | "Finished";

const STATUS_BADGE: Record<Status, { variant: "preparing" | "ongoing" | "ended"; label: string }> = {
  Preparing: { variant: "preparing", label: "準備中" },
  InProgress: { variant: "ongoing", label: "進行中" },
  Finished: { variant: "ended", label: "終了" },
};

/**
 * イベント一覧ページ(Server Component)。
 * 元: src/index.html の #page-events。
 */
export default async function EventsPage() {
  const { events } = await listEvents();

  return (
    <>
      <Card className="admin-only">
        <h2>
          <Icon name="calendar" size={22} className="section-icon" />
          イベント管理
        </h2>
        <Link href="/events/new" style={{ textDecoration: "none" }}>
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Icon name="plus" size={18} className="btn-icon" />}
          >
            イベントをキックオフ!
          </Button>
        </Link>
      </Card>

      <Card>
        <h3>イベント一覧</h3>
        {events.length === 0 ? (
          <EmptyState
            icon="calendar"
            title="まだイベントがありません"
            sub="右上のボタンから作成しましょう"
          />
        ) : (
          <div>
            {events.map((event) => {
              const status = STATUS_BADGE[event.status as Status] ?? STATUS_BADGE.Preparing;
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="event-item"
                >
                  <div className="event-info">
                    <div className="event-name">
                      {event.name}
                      <span className="event-code-inline">{event.joinCode}</span>
                    </div>
                    <div className="event-date">{event.date}</div>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </>
  );
}
