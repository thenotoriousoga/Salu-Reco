"use client";

import { useState } from "react";
import { Badge } from "@/shared/components/ui/Badge";
import { Scoreboard } from "./Scoreboard";

type MatchListItem = {
  id: string;
  matchNumber: number;
  teamAName: string;
  teamBName: string;
  status: "InProgress" | "Finished";
  scoreA: number;
  scoreB: number;
};

type Props = {
  match: MatchListItem;
  eventId: string;
  roundId: string;
  onUpdate: () => void;
};

/**
 * マッチカード。スコアとステータスを表示し、クリックで展開してスコアボードを表示。
 */
export function MatchCard({ match, eventId, roundId, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div
        className="match-item"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${match.teamAName} vs ${match.teamBName}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
      >
        <div className="match-teams">
          <span>{match.teamAName}</span>
          <span className="match-score">{match.scoreA} - {match.scoreB}</span>
          <span>{match.teamBName}</span>
        </div>
        <Badge variant={match.status === "InProgress" ? "ongoing" : "ended"}>
          {match.status === "InProgress" ? "進行中" : "終了"}
        </Badge>
      </div>

      {expanded ? (
        <Scoreboard
          eventId={eventId}
          roundId={roundId}
          matchId={match.id}
          onUpdate={onUpdate}
        />
      ) : null}
    </div>
  );
}
