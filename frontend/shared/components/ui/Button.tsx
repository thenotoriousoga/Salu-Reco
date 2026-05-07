import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "accent" | "danger";
type Size = "sm" | "md" | "lg";

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * 既存デザインの `.btn` / `.btn-primary` などをラップしたボタン。
 * 既存の .btn-large は size="lg" として実現する。
 */
export function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  fullWidth,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    "btn",
    `btn-${variant}`,
    size === "lg" ? "btn-large" : size === "sm" ? "btn-sm" : "",
    fullWidth && size !== "lg" ? "btn-fullwidth" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {leftIcon}
      {children}
    </button>
  );
}
