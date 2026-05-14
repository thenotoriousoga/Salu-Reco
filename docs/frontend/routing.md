# ルーティング設計

## ルーティング方針

- Next.js App Router のファイルベースルーティングを使用
- 認証ガードは Layout で実装し、未認証ユーザーを `/login` にリダイレクト
- ロール別のアクセス制御は Server Component で判定

## ルート一覧

| パス | ロール | 説明 | レンダリング |
|---|---|---|---|
| `/` | 全員 | 認証状態に応じてリダイレクト | Server |
| `/login` | 未認証 | ログイン画面（管理者 / 参加コード） | Server + Client |
| `/events` | ADMIN, USER | イベント一覧 | Server |
| `/events/new` | ADMIN | イベント作成 | Server + Client |
| `/events/[id]` | ADMIN, USER | イベント詳細（タブ切り替え） | Server + Client |

## 画面遷移図

```
/ (ルート)
├── 未認証 → /login
└── 認証済み → /events

/login
├── [参加コード入力] → /events (USER ロール)
├── [管理者パスワード] → /events (ADMIN ロール)
└── [QR コード経由] → /login?code=XXXX → 自動入力

/events
├── [イベント選択] → /events/[id]
└── [イベント作成] → /events/new → /events (作成後リダイレクト)

/events/[id]
├── タブ: メンバー
│   ├── メンバー登録（キュー方式）
│   ├── メンバー編集モーダル
│   └── メンバー削除
├── タブ: 試合
│   ├── ラウンド作成（ステップ UI）
│   ├── チーム分け
│   └── スコアボード
└── タブ: 結果
    ├── 成績ランキング
    ├── アンケート管理
    └── MVP 選出結果
```

## 認証ガード

### Layout ベースのガード

`/events` 配下の全ページは `events/layout.tsx` で認証を検証する。

```tsx
// app/events/layout.tsx
export default async function EventsLayout({ children }) {
  const auth = await getAuthInfo();
  if (!auth) {
    redirect("/login");
  }
  return (
    <>
      <RoleSync role={auth.role === "ADMIN" ? "admin" : "user"} />
      {children}
    </>
  );
}
```

### ロール別アクセス制御

| 操作 | ADMIN | USER |
|---|---|---|
| イベント一覧表示 | ○ | ○（自分のイベントのみ） |
| イベント作成 | ○ | × |
| イベント詳細表示 | ○（全イベント） | ○（参加イベントのみ） |
| メンバー登録・編集・削除 | ○ | × |
| 試合操作（スコア記録） | ○ | ○ |
| MVP 選出実行 | ○ | × |
| MVP 結果閲覧 | ○ | ○ |

### UI レベルのロール制御

CSS クラスベースの表示制御で、管理者限定の UI 要素を非表示にする。

```css
body.role-user .admin-only { display: none !important; }
body.role-admin .user-only { display: none !important; }
```

`RoleSync` コンポーネントがサーバーで取得したロール情報を Zustand ストアに同期し、
`RoleBody` コンポーネントが `<body>` に適切なクラスを付与する。

## リダイレクト戦略

| 条件 | リダイレクト先 |
|---|---|
| 未認証で `/events/*` にアクセス | `/login` |
| 認証済みで `/login` にアクセス | `/events` |
| 認証済みで `/` にアクセス | `/events` |
| USER が `/events/new` にアクセス | `/events`（権限なし） |
| 存在しないイベント ID | 404 (notFound) |

## QR コードによるディープリンク

参加コード付きの URL を QR コードとして表示し、スマホで読み取ると参加コードが自動入力される。

```
https://{host}/login?code={joinCode}
```

`LoginForm` コンポーネントが `searchParams` から `code` パラメータを読み取り、入力欄に自動セットする。
