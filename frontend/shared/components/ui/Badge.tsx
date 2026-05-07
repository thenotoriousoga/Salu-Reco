import type { ReactNode } from "react";

type BadgeVariant =
  | "organizer"
  | "years"
  | "exp"
  | "noexp"
  | "preparing"
  | "ongoing"
  | "ended";

type BadgeProps = {
  variant: BadgeVariant;
  children: ReactNode;
};

/**
 * 既存 .badge / .event-status-badge 相当のラップ。
 * イベントステータス系(preparing/ongoing/ended)は大きめの丸型、
 * それ以外(organizer/years/exp/noexp)は小さめの長方形。
 */
export function Badge({ variant, children }: BadgeProps) {
  const isStatus = variant === "preparing" || variant === "ongoing" || variant === "ended";
  const baseClass = isStatus ? "event-status-badge" : "badge";
  return <span className={`${baseClass} badge-${variant}`}>{children}</span>;
}
