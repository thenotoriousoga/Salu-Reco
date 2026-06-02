"use client";

type TeamResponse = {
  name: string;
  memberIds: string[];
  captainId?: string | null;
};

type Props = {
  teams: TeamResponse[];
  memberNames?: Map<string, string>;
};

/**
 * チーム分け結果をカード形式で表示する。
 * 各チームに CSS 変数で色を適用し、キャプテンには Ⓒ バッジを表示。
 */
export function TeamDisplay({ teams, memberNames }: Props) {
  const getName = (memberId: string) =>
    memberNames?.get(memberId) ?? memberId.slice(0, 8);

  return (
    <div className="team-grid">
      {teams.map((team) => (
        <div key={team.name} className="team-card">
          <h4>{team.name}</h4>
          {team.memberIds.map((id) => (
            <div key={id} className="team-member">
              {getName(id)}
              {id === team.captainId ? (
                <span className="captain-badge">Ⓒ</span>
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
