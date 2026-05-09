import type { ReactNode } from "react";

/**
 * SVG アイコン定義。
 * 元: `src/js.html` の `IC` オブジェクト。
 * viewBox は全て 0 0 24 24、stroke-based。
 */
export const IC: Record<string, ReactNode> = {
  goal: <circle cx="12" cy="12" r="10" />,
  trophy: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 9 7 12 7s5-3 7.5-3a2.5 2.5 0 0 1 0 5H18" />
      <path d="M18 9v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" />
      <path d="M12 7v14" />
    </>
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  x: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  minus: <line x1="5" y1="12" x2="19" y2="12" />,
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  flag: (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </>
  ),
  whistle: (
    <>
      <circle cx="10" cy="12" r="6" />
      <path d="M16 9h5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-5" />
      <circle cx="10" cy="12" r="1" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </>
  ),
  more: (
    <>
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </>
  ),
  arrowLeft: (
    <>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </>
  ),
  arrowRight: <polyline points="9 18 15 12 9 6" />,
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
  play: <polygon points="5 3 19 12 5 21 5 3" />,
  /** ユーザー+プラス(選手登録の見出し用) */
  userPlus: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </>
  ),
  /** ユーザー複数(選手一覧の見出し用) */
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  /** 編集(四角+ペン) */
  edit: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  ),
};

export type IconName = keyof typeof IC;

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  ariaLabel?: string;
};

/**
 * インライン SVG アイコン。stroke:currentColor のため親の color を継承する。
 */
export function Icon({ name, size = 14, className, ariaLabel }: IconProps) {
  return (
    <svg
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      role={ariaLabel ? "img" : undefined}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "inline",
        verticalAlign: "middle",
        stroke: "currentColor",
        fill: "none",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }}
      viewBox="0 0 24 24"
    >
      {IC[name]}
    </svg>
  );
}
