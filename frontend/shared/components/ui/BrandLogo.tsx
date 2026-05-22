/**
 * SALU-REC ブランドロゴ(ヘッダー用・ログイン用)と付属マイクアイコン。
 * 元: src/index.html のヘッダー・ログイン画面 SVG。
 *
 * SVG 内の色は CSS 変数を参照する。stopColor は CSS 変数非対応ブラウザがあるため
 * style 属性経由で指定する。
 */

type BrandLogoProps = {
  className?: string;
  /** ログイン用にグラデーションで描画するかどうか */
  gradient?: boolean;
};

export function BrandLogo({ className, gradient = false }: BrandLogoProps) {
  const strokeColor = gradient ? "url(#salu-logo-grad)" : "var(--header-logo-stroke)";
  const fillColor = gradient ? "url(#salu-logo-grad)" : "var(--accent)";

  return (
    <svg className={className} viewBox="-2500 -2500 5000 5000" aria-hidden="true">
      {gradient ? (
        <defs>
          <linearGradient id="salu-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "var(--accent)" }} />
            <stop offset="50%" style={{ stopColor: "var(--accent-dark)" }} />
            <stop offset="100%" style={{ stopColor: "var(--accent-dark)" }} />
          </linearGradient>
        </defs>
      ) : null}
      <g stroke={strokeColor} strokeWidth="80">
        <circle fill="none" r="2376" />
        <path
          fill="none"
          d="m-1643-1716 155 158m-550 2364c231 231 538 195 826 202m-524-2040c-491 351-610 1064-592 1060m1216-1008c-51 373 84 783 364 1220m-107-2289c157-157 466-267 873-329m-528 4112c-50 132-37 315-8 510m62-3883c282 32 792 74 1196 303m-404 2644c310 173 649 247 1060 180m-340-2008c-242 334-534 645-872 936m1109-2119c-111-207-296-375-499-534m1146 1281c100 3 197 44 290 141m-438 495c158 297 181 718 204 1140"
        />
      </g>
      <path
        fill={fillColor}
        d="m-1624-1700c243-153 498-303 856-424 141 117 253 307 372 492-288 275-562 544-724 756-274-25-410-2-740-60 3-244 84-499 236-764zm2904-40c271 248 537 498 724 788-55 262-105 553-180 704-234-35-536-125-820-200-138-357-231-625-340-924 210-156 417-296 616-368zm-3273 3033a2376 2376 0 0 1-378-1392l59-7c54 342 124 674 311 928-36 179-2 323 51 458zm1197-1125c365 60 717 120 1060 180 106 333 120 667 156 1000-263 218-625 287-944 420-372-240-523-508-736-768 122-281 257-561 464-832zm3013 678a2376 2376 0 0 1-925 1147l-116-5c84-127 114-297 118-488 232-111 464-463 696-772 86 30 159 72 227 118zm-2287 1527a2376 2376 0 0 1-993-251c199 74 367 143 542 83 53 75 176 134 451 168z"
      />
    </svg>
  );
}

type BrandMicProps = {
  className?: string;
  gradient?: boolean;
};

/**
 * SALU-REC タイトル横のマイクアイコン。
 */
export function BrandMic({ className, gradient = false }: BrandMicProps) {
  if (gradient) {
    return (
      <svg className={className} viewBox="0 0 24 32" aria-hidden="true">
        <defs>
          <linearGradient id="salu-mic-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "var(--accent)" }} />
            <stop offset="100%" style={{ stopColor: "var(--accent-dark)" }} />
          </linearGradient>
        </defs>
        <rect x="6" y="1" width="12" height="16" rx="6" fill="url(#salu-mic-grad)" />
        <path
          d="M4 13 a8 8 0 0 0 16 0"
          fill="none"
          stroke="var(--accent-dark)"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <line x1="12" y1="21" x2="12" y2="26" stroke="var(--accent-dark)" strokeWidth="2.8" />
        <rect x="6" y="26" width="12" height="3.5" rx="0.5" fill="url(#salu-mic-grad)" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 32" aria-hidden="true">
      <rect x="6" y="1" width="12" height="16" rx="6" fill="var(--accent)" />
      <path
        d="M4 13 a8 8 0 0 0 16 0"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <line x1="12" y1="21" x2="12" y2="26" stroke="var(--accent)" strokeWidth="2.8" />
      <rect x="6" y="26" width="12" height="3.5" rx="0.5" fill="var(--accent)" />
    </svg>
  );
}
