# Match Operation コンテキスト — ドメインサービス

## TeamSplitService

チーム分けは Round 生成前の独立ロジック。集約に含めない。

```kotlin
class TeamSplitService {
    fun split(
        members: List<MemberForSplit>,       // 軽量DTO（memberId + 経験）
        teamCount: Int,
        existingTeams: List<Team>? = null,
    ): TeamAssignment
}
```

### アルゴリズム

- Fisher-Yates シャッフル + ラウンドロビン配分
- 経験者と未経験者をそれぞれシャッフルし、均等に配分
- 既存チーム考慮モード: 既にチームにメンバーがいる場合、未割当メンバーを同じロジックで配分
- **キャプテン選出**: 各チームからランダムに1名をキャプテンとして選出し、`Team.captainId` に設定

### 制約

- 最低4人以上が必要
- チーム数は 2〜最大（人数÷3）まで設定可能（1チーム最低3人）

### キャプテン選出ルール

- 各チームから1名をランダムに選出
- 特別な条件（経験者優先等）は設けない（完全ランダム）
- キャプテンはフロントエンドでバッジ表示（Ⓒ）、LINE通知でも先頭に表示

### 設計意図

- Member 集約への依存を避けるため、入力は軽量DTO (`MemberForSplit`)
- `MemberForSplit` は `memberId: MemberId` + `soccerExperience: SoccerExperience` のみ
- UseCase が Member コンテキストからメンバー情報を取得し、DTO に変換して渡す
