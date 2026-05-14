import Link from "next/link";
import { Card } from "@/shared/components/ui/Card";
import { Icon } from "@/shared/icons/ic";
import { CreateEventForm } from "@/features/event/components/CreateEventForm";

/**
 * イベント作成ページ。
 * 元: src/index.html の #page-create-event。
 */
export default function NewEventPage() {
  return (
    <Card className="login-card" style={{ maxWidth: 400, margin: "24px auto" }}>
      <h3>
        <Icon name="calendar" size={18} className="section-icon" />
        イベントを作る
      </h3>
      <CreateEventForm />
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <Link
          href="/events"
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            textDecoration: "none",
          }}
        >
          ← 一覧に戻る
        </Link>
      </div>
    </Card>
  );
}
