# Single Source of Truth (SSoT) ルール

プロジェクト全体で情報の重複を排除し、各情報には唯一の正（Single Source of Truth）を定める。

## SSoT マップ

| 情報 | 正のソース | 備考 |
|---|---|---|
| API 仕様（エンドポイント、リクエスト/レスポンス型） | `api/openapi.yaml` | バックエンド・フロントエンド両方のコードを自動生成する |
| DB スキーマ（テーブル定義、制約、インデックス） | `backend/src/main/resources/db/migration/V*.sql` | Flyway マイグレーションが唯一の DDL ソース |
| ER 図・テーブル一覧（概要レベル） | `docs/er-diagram.md` | Flyway SQL の可読性補完。DDL の詳細は Flyway が正 |
| バックエンド設計（アーキテクチャ、パターン、ルール） | `docs/backend/design/` | 全設計判断はここに集約 |
| フロントエンド設計（アーキテクチャ、コンポーネント、ルーティング） | `docs/frontend/` | 全設計判断はここに集約 |
| Docker 環境（構成、コマンド、トラブルシューティング） | `docs/docker-strategy.md` | 開発・本番の Docker 戦略を一元管理 |
| リプレース進捗 | `docs/refactoring/09-progress.md` | 唯一の進捗管理ファイル |
| リプレース実行手順 | `docs/refactoring/08-execution-guide.md` | Phase ごとの具体的手順 |
| AI エージェント向けルール（バックエンド） | `docs/backend/AGENTS.md` | |
| AI エージェント向けルール（フロントエンド） | `docs/frontend/AGENTS.md` | |
| AI エージェント向けルール（プロジェクト全体） | `AGENTS.md`（ルート） | |

## 守るべきルール

1. **同じ情報を2箇所以上に書かない**。他のドキュメントから参照する場合はリンクを貼る
2. **正のソースを変更したら、それだけで完結する**。他のファイルへの手動同期は不要な構成にする
3. **`docs/refactoring/` は進捗管理と実行手順のみ**。設計情報・技術仕様は持たない
4. **API エンドポイント一覧を手書きしない**。`api/openapi.yaml` を読めば分かる
5. **DDL を手書きドキュメントに転記しない**。Flyway SQL が正。概要は `docs/er-diagram.md` で補完
6. **技術スタックのバージョンは `build.gradle.kts` と `package.json` が正**。ドキュメントに書く場合は「参考情報」と明記する
7. **設計判断を記録する場所は `docs/backend/design/` または `docs/frontend/` の該当ファイル**

## ドキュメント変更時のチェックリスト

- [ ] この情報の正のソースはどこか？（SSoT マップを確認）
- [ ] 正のソース以外に同じ情報が書かれていないか？
- [ ] 他のドキュメントからリンクで参照できないか？（コピーではなくリンク）
