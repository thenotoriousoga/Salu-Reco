# Auth.gs ↔ Identity & Access コンテキスト

## GAS 側の公開関数

| 関数名 | 呼び出し元 | 処理内容 |
|---|---|---|
| `loginAdmin(password)` | `js-auth.html` | 管理者パスワード認証 |
| `loginWithCode(code)` | `js-auth.html` | イベントコードで参加認証 |

## 新実装での対応先

| GAS 関数 | UseCase | API エンドポイント |
|---|---|---|
| `loginAdmin` | `LoginAsAdminUseCase` | `POST /api/auth/login-admin` |
| `loginWithCode` | `LoginWithJoinCodeUseCase` | `POST /api/auth/login-with-code` |

## 差分・変更点

| 項目 | GAS 版 | 新実装 |
|---|---|---|
| 認証方式 | クライアント側 `currentRole` 変数 | JWT (httpOnly Cookie) |
| パスワード保存 | スクリプトプロパティ | 環境変数 `ADMIN_PASSWORD` |
| セッション管理 | なし（ステートレス） | JWT トークン（24時間有効） |
| レスポンス | `{ success, role, eventId }` | `{ token, role, eventId }` |
| `loginWithCode` の戻り値 | メンバー一覧も返す | トークンのみ。メンバーは別 API で取得 |

## 廃止される機能

- なし（認証の基本フローは同じ）

## 補足

- GAS 版では `loginWithCode` がメンバー一覧も一緒に返していたが、新実装では関心の分離のため認証とデータ取得を分ける
- 幹事ロールは GAS 版では `currentRole = 'admin'` として扱っていたが、新実装でも同様に JWT の `role: ADMIN` として発行する
