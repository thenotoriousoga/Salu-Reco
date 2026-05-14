# 状態管理

## 設計方針

サーバー状態とクライアント状態を明確に分離し、それぞれに最適な手法を適用する。

| 状態の種類 | 管理手法 | 例 |
|---|---|---|
| サーバー状態 | Server Components でフェッチ | イベント一覧、メンバー一覧、試合データ |
| UI フィードバック状態 | Zustand | トースト、ローディング、モーダル |
| 認証状態 | Cookie (サーバー) + Zustand (クライアント同期) | ロール、ログイン状態 |
| フォーム状態 | React Hook Form | 入力値、バリデーションエラー |
| コンポーネントローカル状態 | useState | タブ選択、トグル、一時的な UI 状態 |

## Zustand ストア

グローバルな UI フィードバックに限定して Zustand を使用する。ビジネスデータは含めない。

### ストア一覧

| ストア | 責務 | ファイル |
|---|---|---|
| `useRoleStore` | 現在のロール (admin / user / null) | `shared/store/role.ts` |
| `useToastStore` | トースト通知の表示・非表示 | `shared/store/toast.ts` |
| `useLoadingStore` | 全画面ローディングオーバーレイ | `shared/store/loading.ts` |
| `useModalStore` | 確認ダイアログの状態管理 | `shared/store/modal.ts` |

### useRoleStore

```typescript
type Role = "admin" | "user" | null;

type RoleState = {
  role: Role;
  setRole: (role: Role) => void;
};
```

- サーバーで取得した認証情報を `RoleSync` コンポーネント経由でクライアントに同期
- CSS クラスベースのロール別表示制御に使用

### useToastStore

```typescript
type ToastKind = "info" | "error";

type ToastState = {
  message: string | null;
  kind: ToastKind;
  show: (message: string, kind?: ToastKind) => void;
  hide: () => void;
};
```

- 同時に 1 つまで表示、2.5 秒で自動消去
- フックの外からも呼べる便利関数を export: `toast.info()`, `toast.error()`

### useLoadingStore

```typescript
type LoadingState = {
  count: number;        // カウンタ方式で複数呼び出しに対応
  message: string | null;
  sub: string | null;
  show: (message?: string, sub?: string) => void;
  hide: () => void;
};
```

- 複数箇所から同時に `show()` が呼ばれてもカウンタで管理
- 全ての `hide()` が呼ばれるまでオーバーレイを維持

### useModalStore

```typescript
type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ModalState = {
  open: boolean;
  options: ConfirmOptions | null;
  openConfirm: (options: ConfirmOptions) => Promise<boolean>;
  close: (result: boolean) => void;
};
```

- `confirmDialog()` で Promise ベースの確認ダイアログを表示
- `window.confirm()` の代替として、デザインシステムに統一されたモーダルを提供

## サーバー状態の取得パターン

### Server Components での直接フェッチ

データ表示が主目的のページでは、Server Components で直接 API を呼び出す。

```tsx
// app/events/page.tsx (Server Component)
export default async function EventsPage() {
  const { events } = await listEvents();
  return <EventList events={events} />;
}
```

### Client Components でのフェッチ

ユーザー操作に応じたデータ更新が必要な場合は、Client Components で fetch を使用する。

```tsx
// features/member/components/MembersPanel.tsx
const reload = useCallback(async () => {
  const res = await fetch(`/api/events/${eventId}/members`);
  const data = await res.json();
  setMembers(data.members ?? []);
}, [eventId]);
```

### データ更新後のリフレッシュ

- `router.refresh()`: Server Components のデータを再取得（ページ全体）
- ローカル `reload()`: 特定コンポーネントのデータのみ再取得

## フォーム状態管理

React Hook Form + Zod でフォームの状態とバリデーションを管理する。

```tsx
const schema = z.object({
  name: z.string().min(1, "イベント名を入力してください").max(100),
  date: z.string().min(1, "開催日を入力してください"),
});

const form = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { name: "フットサル", date: "" },
});
```

### バリデーション方針

- クライアント側: Zod スキーマで即座にフィードバック
- サーバー側: バックエンドが最終的なバリデーションを実施
- 両者のルールは可能な限り一致させる（イベント名の文字数制限など）

## キュー方式の状態管理

メンバー登録では「追加待ちキュー」パターンを採用する。

```
[入力] → [キューに追加 (ローカル state)] → [一括登録 (API 呼び出し)]
```

- キューは `useState` で管理（コンポーネントローカル）
- 一括登録成功後にキューをクリアし、サーバーからデータを再取得
- 1 人ずつ API を叩く方式と比べ、操作ミスの修正が容易

## 楽観的 UI 更新

スコアの +1/-1 操作など、即座のフィードバックが求められる操作では楽観的更新を行う。

1. UI を即座に更新
2. デバウンス（300ms）でサーバーに保存
3. エラー時はロールバック + エラートースト表示
