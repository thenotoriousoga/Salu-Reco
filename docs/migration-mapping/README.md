# GAS → 新実装 マッピングドキュメント

## 目的

GAS 版（`src/`）の関数・データ構造と、新実装（`backend/` + `frontend/`）のどこに対応するかを明確にする。
リプレース作業中に「この GAS 関数は新実装のどこに移行するのか？」を即座に判断できるようにする。

## 削除タイミング

**リプレース完了（Phase 9）後に `docs/migration-mapping/` ディレクトリごと削除する。**

既存のドキュメント（`docs/backend/`, `docs/frontend/`, `docs/refactoring/`）には依存しておらず、
このディレクトリを削除しても他のドキュメントに影響はない。

## ファイル一覧

| ファイル | 内容 |
|---|---|
| [auth.md](auth.md) | `Auth.gs` ↔ Identity & Access コンテキスト |
| [event.md](event.md) | `Events.gs` ↔ Event コンテキスト |
| [member.md](member.md) | `Members.gs` ↔ Member コンテキスト |
| [match.md](match.md) | `Rounds.gs` + `TeamSplit.gs` ↔ Match Operation コンテキスト |
| [mvp.md](mvp.md) | `Mvp.gs` + `Gemini.gs` ↔ MVP Evaluation コンテキスト |
| [survey.md](survey.md) | `Survey.gs` ↔ Survey コンテキスト |
| [data-model.md](data-model.md) | スプレッドシート 8 シート ↔ PostgreSQL テーブル |

## 読み方

各ファイルは以下の構成で統一:

1. **GAS 側の公開関数一覧** — クライアントから呼ばれる関数
2. **新実装での対応先** — UseCase / Controller / API エンドポイント
3. **差分・変更点** — GAS 版から変わるビジネスロジックや仕様

## 関連ドキュメント

- GAS 版の仕様: [AGENTS.md](../../AGENTS.md)（ルート）
- 新実装の設計: [docs/backend/design/](../backend/design/README.md)
- リプレース進捗: [docs/refactoring/09-progress.md](../refactoring/09-progress.md)
