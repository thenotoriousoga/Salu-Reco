"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Icon } from "@/shared/icons/ic";
import { BrandLogo, BrandMic } from "@/shared/components/ui/BrandLogo";
import { useLoadingStore } from "@/shared/store/loading";
import { toast } from "@/shared/store/toast";

/**
 * 既存 src/index.html の #page-login のデザインと構造を踏襲したログイン画面。
 * QR コードから `?code=XXXXX` 付きで来たときは参加コード入力欄に自動セットする。
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loading = useLoadingStore();
  const [joinCode, setJoinCode] = useState("");
  const [adminVisible, setAdminVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");

  useEffect(() => {
    const preset = searchParams.get("code");
    if (preset) setJoinCode(preset.toUpperCase());
  }, [searchParams]);

  const submitJoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      toast.error("参加コードを入力してください");
      return;
    }
    loading.show("参加中...");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "joinCode", joinCode: joinCode.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message ?? `ログインに失敗しました (${res.status})`);
      }
      toast.info("ログインしました");
      router.push("/events");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      loading.hide();
    }
  };

  const submitAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      toast.error("パスワードを入力してください");
      return;
    }
    loading.show("認証中...");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "admin", password: adminPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message ?? `ログインに失敗しました (${res.status})`);
      }
      toast.info("管理者としてログインしました");
      router.push("/events");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      loading.hide();
    }
  };

  return (
    <>
      <div className="login-hero">
        <div className="login-hero-icon">
          <BrandLogo className="login-logo" gradient />
        </div>
        <h2 className="login-hero-title">
          SALU-REC
          <BrandMic className="login-mic" gradient />
        </h2>
        <p className="login-hero-sub">参加コードを入力してピッチに立とう</p>
      </div>

      <Card className="login-card">
        <form onSubmit={submitJoinCode} className="login-code-input-wrap">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="参加コードを入力"
            className="login-code-input"
            maxLength={10}
            autoComplete="off"
            aria-label="参加コード"
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            leftIcon={<Icon name="play" size={18} className="btn-icon" />}
          >
            イベントに参加する
          </Button>
        </form>
      </Card>

      <div className="login-admin-area">
        <button
          type="button"
          className="admin-toggle-link"
          onClick={() => setAdminVisible((v) => !v)}
        >
          管理者はこちら
        </button>
        {adminVisible ? (
          <Card className="login-card" style={{ marginTop: 12 }}>
            <form onSubmit={submitAdminPassword}>
              <div className="input-group">
                <label htmlFor="login-password">パスワード</label>
                <input
                  id="login-password"
                  type="password"
                  className="input"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                size="lg"
                leftIcon={<Icon name="arrowRight" size={18} className="btn-icon" />}
              >
                管理者モードへ
              </Button>
            </form>
          </Card>
        ) : null}
      </div>
    </>
  );
}
