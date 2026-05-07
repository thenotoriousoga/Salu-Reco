"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Icon } from "@/shared/icons/ic";
import { toast } from "@/shared/store/toast";

type JoinCodeBlockProps = {
  joinCode: string;
};

/**
 * 参加コードをクリックでコピー、同時に QR コードも並べて表示する。
 * 元: 既存の `.created-event-code` を踏襲しつつ QRコードを追加(ADR-007)。
 */
export function JoinCodeBlock({ joinCode }: JoinCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      toast.info("参加コードをコピーしました");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const qrValue =
    typeof window !== "undefined"
      ? `${window.location.origin}/login?code=${encodeURIComponent(joinCode)}`
      : `/login?code=${encodeURIComponent(joinCode)}`;

  return (
    <div style={{ display: "grid", gap: 16, placeItems: "center" }}>
      <button
        type="button"
        className="created-event-code"
        onClick={handleCopy}
        aria-label="参加コードをコピー"
      >
        {joinCode}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            marginLeft: 12,
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            letterSpacing: "normal",
            fontWeight: 400,
          }}
        >
          <Icon name={copied ? "check" : "file"} size={14} />
          <span style={{ marginLeft: 4 }}>
            {copied ? "コピー済み" : "タップでコピー"}
          </span>
        </span>
      </button>
      <div
        style={{
          padding: 12,
          background: "white",
          borderRadius: "var(--radius-sm)",
          border: "2px solid var(--border)",
        }}
      >
        <QRCodeSVG
          value={qrValue}
          size={160}
          level="M"
          includeMargin={false}
        />
      </div>
      <p
        style={{
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        QR コードを読み取ると参加コード入力済みのログイン画面が開きます
      </p>
    </div>
  );
}
