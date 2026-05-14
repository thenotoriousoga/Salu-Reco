# テスト戦略

## テスト方針

| 原則 | 説明 |
|---|---|
| ユーザー視点のテスト | 実装の詳細ではなく、ユーザーが見る振る舞いをテストする |
| テストピラミッド | 単体テスト > 統合テスト > E2E テスト の比率で構成 |
| 型安全性の活用 | TypeScript + OpenAPI 型生成で、型レベルのバグを排除 |
| CI での自動実行 | プルリクエスト時に全テストを自動実行 |

## テスト種別

### 1. 単体テスト (Unit Tests)

純粋なロジックのテスト。外部依存なし。

| 対象 | テストツール | 例 |
|---|---|---|
| Zod スキーマ | Vitest | バリデーションルールの検証 |
| ユーティリティ関数 | Vitest | エラー変換、日付フォーマット |
| Zustand ストア | Vitest | 状態遷移のテスト |

```typescript
// features/event/schema.test.ts
import { describe, it, expect } from "vitest";
import { createEventSchema } from "./schema";

describe("createEventSchema", () => {
  it("空のイベント名を拒否する", () => {
    const result = createEventSchema.safeParse({ name: "", date: "2025-01-01" });
    expect(result.success).toBe(false);
  });

  it("100文字を超えるイベント名を拒否する", () => {
    const result = createEventSchema.safeParse({ name: "a".repeat(101), date: "2025-01-01" });
    expect(result.success).toBe(false);
  });
});
```

### 2. コンポーネントテスト (Component Tests)

React コンポーネントのレンダリングとインタラクションのテスト。

| 対象 | テストツール | 例 |
|---|---|---|
| 共通 UI コンポーネント | Vitest + Testing Library | Button, Badge, Card の表示 |
| Feature コンポーネント | Vitest + Testing Library | フォーム入力、バリデーション表示 |

```typescript
// shared/components/ui/Button.test.tsx
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("variant に応じたクラスが付与される", () => {
    render(<Button variant="primary">テスト</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-primary");
  });

  it("disabled 時にクリックイベントが発火しない", () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>テスト</Button>);
    screen.getByRole("button").click();
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

### 3. 統合テスト (Integration Tests)

API 呼び出しを含むコンポーネントの統合テスト。MSW でバックエンドをモック。

| 対象 | テストツール | 例 |
|---|---|---|
| ログインフロー | Vitest + Testing Library + MSW | フォーム送信 → API → リダイレクト |
| メンバー登録 | Vitest + Testing Library + MSW | キュー追加 → 一括登録 → 一覧更新 |

```typescript
// features/auth/components/LoginForm.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  it("参加コードでログインできる", async () => {
    server.use(
      http.post("/api/auth/login", () => {
        return HttpResponse.json({ role: "USER", eventId: "ev-001" });
      }),
    );

    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("参加コード"), "ABCD");
    await userEvent.click(screen.getByText("イベントに参加する"));

    await waitFor(() => {
      // リダイレクトが呼ばれたことを検証
    });
  });
});
```

### 4. E2E テスト (End-to-End Tests)

ブラウザ上での実際のユーザーフローをテスト。

| 対象 | テストツール | 例 |
|---|---|---|
| ログイン → イベント作成 → メンバー登録 | Playwright | 主要ユーザーフロー |
| スコア記録 → MVP 選出 | Playwright | 試合フロー |

```typescript
// e2e/event-flow.spec.ts
import { test, expect } from "@playwright/test";

test("管理者がイベントを作成できる", async ({ page }) => {
  await page.goto("/login");
  await page.getByText("管理者はこちら").click();
  await page.getByLabel("パスワード").fill("admin123");
  await page.getByText("管理者モードへ").click();

  await expect(page).toHaveURL("/events");
  await page.getByText("イベントをキックオフ!").click();

  await page.getByLabel("イベント名").fill("テストフットサル");
  await page.getByLabel("日付").fill("2025-06-01");
  await page.getByText("作成してはじめる").click();

  await expect(page).toHaveURL("/events");
});
```

## テストツール構成

| ツール | 用途 |
|---|---|
| Vitest | テストランナー、アサーション |
| @testing-library/react | コンポーネントレンダリング |
| @testing-library/user-event | ユーザーインタラクションシミュレーション |
| MSW (Mock Service Worker) | API モック |
| Playwright | E2E テスト |

## テストファイルの配置

```
features/
├── event/
│   ├── components/
│   │   ├── CreateEventForm.tsx
│   │   └── CreateEventForm.test.tsx    ← コロケーション
│   └── schema.ts
│       └── schema.test.ts
shared/
├── components/ui/
│   ├── Button.tsx
│   └── Button.test.tsx
e2e/
├── event-flow.spec.ts
└── auth-flow.spec.ts
```

テストファイルはテスト対象と同じディレクトリに配置する（コロケーション）。

## テスト実行

```bash
# 単体テスト + コンポーネントテスト
pnpm test

# ウォッチモード
pnpm test:watch

# カバレッジ
pnpm test:coverage

# E2E テスト
pnpm test:e2e
```

## CI/CD でのテスト

プルリクエスト時に以下を自動実行:

1. TypeScript 型チェック (`tsc --noEmit`)
2. ESLint
3. 単体テスト + コンポーネントテスト (Vitest)
4. E2E テスト (Playwright) ※ Docker Compose でバックエンドを起動

## テスト対象の優先度

| 優先度 | 対象 | 理由 |
|---|---|---|
| 高 | Zod バリデーションスキーマ | ビジネスルールの保証 |
| 高 | 認証フロー | セキュリティに直結 |
| 中 | フォーム送信 + API 連携 | ユーザー操作の正常系・異常系 |
| 中 | ロール別表示制御 | 権限漏れの防止 |
| 低 | 純 UI コンポーネント | 視覚的な確認で十分な場合が多い |
