# バックエンド設計ドキュメント

## 読み方ガイド

初めてこのプロジェクトの設計を読む場合は、以下の順序を推奨します。

### Step 1: 全体像を掴む

1. [backend-architecture.md](backend-architecture.md) — アーキテクチャ全体像（Clean Architecture + DDD + Hexagonal）
2. [context-map.md](context-map.md) — バウンデッドコンテキストの一覧と関係性
3. [ubiquitous-language.md](ubiquitous-language.md) — ドメイン用語辞書

### Step 2: 実装パターンを理解する

4. [domain-modeling.md](domain-modeling.md) — Domain 層の実装パターン（Entity, VO, Event, Repository）
5. [aggregates-overview.md](aggregates-overview.md) — 集約設計の全体方針と一覧
6. [package-structure.md](package-structure.md) — パッケージ構成とモジュール配置
7. [persistence-strategy.md](persistence-strategy.md) — JPA 永続化戦略（Persistence Model 分離）

### Step 3: 各層の詳細

8. [presentation-layer.md](presentation-layer.md) — API-first アプローチ、Controller 実装パターン
9. [cross-cutting.md](cross-cutting.md) — 認証・認可、例外ハンドリング、ドメインイベント、外部API連携
10. [testing-strategy.md](testing-strategy.md) — テスト戦略とアーキテクチャ境界テスト

### Step 4: コンテキスト別の詳細設計

各コンテキストのサブディレクトリに、集約・ユースケース・ドメインイベントの詳細がある。

| コンテキスト | ディレクトリ | 概要 |
|---|---|---|
| Event | [event/](event/) | イベントのライフサイクル管理 |
| Identity & Access | [identity/](identity/) | 認証・JWT発行（ステートレス） |
| Member | [member/](member/) | イベント内メンバーの管理 |
| Match Operation | [match/](match/) | ラウンド・マッチ・チーム分け・得点記録 |
| MVP Evaluation | [mvp/](mvp/) | Gemini AI 評価、レーティング、MVP選出 |
| Survey | [survey/](survey/) | アンケートフォーム管理、回答取得 |

---

## ディレクトリ構成

```
docs/backend/design/
├── README.md                    ← このファイル（ナビゲーション）
│
├── backend-architecture.md      アーキテクチャ全体像
├── context-map.md               コンテキストマップ
├── ubiquitous-language.md       ユビキタス言語
├── domain-modeling.md           Domain 層の実装パターン
├── aggregates-overview.md       集約設計の全体方針・一覧
├── package-structure.md         パッケージ構成
├── persistence-strategy.md      永続化戦略
├── presentation-layer.md        プレゼンテーション層
├── cross-cutting.md             横断的関心事
├── testing-strategy.md          テスト戦略
│
├── event/                       Event コンテキスト
│   ├── aggregates.md
│   ├── domain-events.md
│   └── usecases.md
│
├── identity/                    Identity & Access コンテキスト
│   ├── README.md                設計判断の記録
│   └── usecases.md
│
├── match/                       Match Operation コンテキスト
│   ├── aggregates.md
│   ├── domain-events.md
│   ├── domain-services.md
│   └── usecases.md
│
├── member/                      Member コンテキスト
│   ├── aggregates.md
│   ├── domain-events.md
│   └── usecases.md
│
├── mvp/                         MVP Evaluation コンテキスト
│   ├── aggregates.md
│   ├── domain-events.md
│   └── usecases.md
│
└── survey/                      Survey コンテキスト
    ├── aggregates.md
    ├── domain-events.md
    └── usecases.md
```

## コンテキスト別ドキュメントの構成ルール

各コンテキストのサブディレクトリには、以下のファイルを配置する。

| ファイル | 必須 | 内容 |
|---|---|---|
| `aggregates.md` | ○ | 集約ルート、値オブジェクト、不変条件、振る舞い |
| `usecases.md` | ○ | Command / Query のユースケース一覧 |
| `domain-events.md` | ○ | 発行するドメインイベントの定義 |
| `domain-services.md` | △ | 集約に属さないドメインロジックがある場合のみ |
| `README.md` | △ | 特殊な設計判断がある場合のみ（例: identity） |

※ Identity & Access は「ステートレスで集約・イベントを持たない」という設計判断があるため、`aggregates.md` と `domain-events.md` を省略している。詳細は [identity/README.md](identity/README.md) を参照。
