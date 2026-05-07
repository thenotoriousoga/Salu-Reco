import type { ReactNode } from "react";

type InputGroupProps = {
  label: string;
  htmlFor: string;
  children: ReactNode;
  error?: string;
};

/**
 * 既存デザインの .input-group を再現。ラベルとフィールドを横並びで置く。
 */
export function InputGroup({ label, htmlFor, children, error }: InputGroupProps) {
  return (
    <div className="input-group">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? (
        <p className="input-error" role="alert" style={{ width: "100%", marginTop: 4, fontSize: "0.78rem", color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
