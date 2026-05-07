import type { ReactNode } from "react";
import { Icon, type IconName } from "@/shared/icons/ic";

type EmptyStateProps = {
  icon?: IconName;
  title: string;
  sub?: string;
  action?: ReactNode;
};

/**
 * 既存 .empty-state の React 版。
 */
export function EmptyState({ icon = "info", title, sub, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={48} className="empty-icon" />
      <p>{title}</p>
      {sub ? <p className="empty-sub">{sub}</p> : null}
      {action ? <div style={{ marginTop: 12 }}>{action}</div> : null}
    </div>
  );
}
