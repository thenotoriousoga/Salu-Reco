import type { HTMLAttributes, ReactNode } from "react";

type CardProps = {
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

/**
 * 既存デザインの .card クラスをラップ。
 * h2 / h3 などの見出しは直接 children で書く前提(既存の構造に合わせるため)。
 */
export function Card({ children, className, ...rest }: CardProps) {
  const classes = ["card", className ?? ""].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
