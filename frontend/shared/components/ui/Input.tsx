import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * 既存デザインの `.input` をラップした素のinput。
 * `InputGroup` と併用することを想定。
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...rest },
  ref,
) {
  const classes = ["input", className ?? ""].filter(Boolean).join(" ");
  return <input ref={ref} className={classes} {...rest} />;
});
