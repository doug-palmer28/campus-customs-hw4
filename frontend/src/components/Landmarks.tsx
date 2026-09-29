// Cartoon Yale landmarks, drawn in inline SVG in the same friendly style as
// Handsome Dan. Each is a compact ~120x120 viewBox using the Yale palette.
// Used as faint background decoration and showcased (labeled) on the About page.

import type { ReactNode } from "react";

type LandmarkProps = { size?: number; className?: string };

const NAVY = "#00356b";
const NAVY_DK = "#002140";
const GOLD = "#bd9b60";
const STONE = "#d9cdb8";
const STONE_DK = "#b8a888";
const GLASS = "#9fc0e8";

function Frame({ size = 120, className = "", children }: LandmarkProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={`landmark ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

// Yale Bowl — the great oval football stadium.
export function YaleBowl(p: LandmarkProps) {
  return (
    <Frame {...p}>
      <ellipse cx="60" cy="74" rx="50" ry="26" fill={STONE} stroke={STONE_DK} strokeWidth="2" />
      <ellipse cx="60" cy="70" rx="38" ry="18" fill="#6aa06a" stroke="#ffffff" strokeWidth="1.5" />
      <line x1="60" y1="52" x2="60" y2="88" stroke="#ffffff" strokeWidth="1.5" />
      <line x1="40" y1="58" x2="40" y2="82" stroke="#ffffff" strokeWidth="1" />
      <line x1="80" y1="58" x2="80" y2="82" stroke="#ffffff" strokeWidth="1" />
      {/* pennant */}
      <line x1="60" y1="20" x2="60" y2="50" stroke={NAVY} strokeWidth="3" />
      <path d="M60 22 L82 28 L60 34 Z" fill={NAVY} />
      <text x="66" y="31" fill="#fff" fontSize="7" fontWeight="700" fontFamily="Georgia, serif">Y</text>
    </Frame>
  );
}

// Ingalls Rink — "The Whale," with its famous swooping backbone roof.
export function IngallsRink(p: LandmarkProps) {
  return (
    <Frame {...p}>
      <path d="M8 86 Q60 18 112 86 Z" fill={NAVY} stroke={NAVY_DK} strokeWidth="2" />
      <path d="M8 86 Q60 30 112 86" fill="none" stroke={GOLD} strokeWidth="3" />
      <rect x="8" y="86" width="104" height="10" fill={STONE} stroke={STONE_DK} strokeWidth="1.5" />
      {/* spine ridge */}
      <path d="M60 22 Q61 50 60 86" stroke={GOLD} strokeWidth="2.5" fill="none" />
      <rect x="52" y="88" width="16" height="8" fill={NAVY_DK} />
    </Frame>
  );
}

// School of Management (Evans Hall) — a modern glass-and-stone courtyard building.
export function SchoolOfManagement(p: LandmarkProps) {
  return (
    <Frame {...p}>
      <rect x="16" y="46" width="88" height="50" fill={STONE} stroke={STONE_DK} strokeWidth="2" />
      {/* glass grid */}
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2, 3, 4, 5].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={20 + c * 14}
            y={50 + r * 11}
            width="11"
            height="8"
            fill={GLASS}
            stroke="#ffffff"
            strokeWidth="0.8"
          />
        )),
      )}
      {/* arcade columns */}
      <rect x="16" y="88" width="88" height="8" fill={NAVY} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={22 + i * 18} y="88" width="4" height="8" fill={NAVY_DK} />
      ))}
    </Frame>
  );
}

// Payne Whitney Gymnasium — the "Cathedral of Sweat," a soaring Gothic tower.
export function PayneWhitneyGym(p: LandmarkProps) {
  return (
    <Frame {...p}>
      <rect x="46" y="18" width="28" height="78" fill={STONE} stroke={STONE_DK} strokeWidth="2" />
      <path d="M46 18 L60 8 L74 18 Z" fill={NAVY} />
      {/* tall gothic windows */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M${52 + i * 0} ${34 + i * 20} h6 v10 a3 3 0 0 1 -6 0 Z`}
          fill={GLASS}
          stroke={NAVY}
          strokeWidth="1"
          transform={`translate(${i * 0},0)`}
        />
      ))}
      <rect x="51" y="34" width="6" height="12" rx="3" fill={GLASS} stroke={NAVY} strokeWidth="1" />
      <rect x="63" y="34" width="6" height="12" rx="3" fill={GLASS} stroke={NAVY} strokeWidth="1" />
      <rect x="51" y="54" width="6" height="12" rx="3" fill={GLASS} stroke={NAVY} strokeWidth="1" />
      <rect x="63" y="54" width="6" height="12" rx="3" fill={GLASS} stroke={NAVY} strokeWidth="1" />
      {/* flanking wings */}
      <rect x="26" y="70" width="20" height="26" fill={STONE_DK} stroke={STONE_DK} strokeWidth="1" />
      <rect x="74" y="70" width="20" height="26" fill={STONE_DK} stroke={STONE_DK} strokeWidth="1" />
      <rect x="56" y="82" width="8" height="14" fill={NAVY_DK} />
    </Frame>
  );
}

// Beinecke Rare Book Library — a marble box lifted on corner piers.
export function BeineckeLibrary(p: LandmarkProps) {
  return (
    <Frame {...p}>
      <rect x="22" y="34" width="76" height="46" fill={STONE} stroke={STONE_DK} strokeWidth="2" />
      {/* translucent marble grid */}
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={26 + c * 18}
            y={38 + r * 14}
            width="15"
            height="11"
            fill="#efe7d6"
            stroke={GOLD}
            strokeWidth="1"
          />
        )),
      )}
      {/* corner piers */}
      <rect x="22" y="80" width="8" height="14" fill={NAVY} />
      <rect x="90" y="80" width="8" height="14" fill={NAVY} />
      <rect x="22" y="30" width="76" height="4" fill={NAVY} />
    </Frame>
  );
}

// Sterling Memorial Library — the Gothic "cathedral of books."
export function SterlingLibrary(p: LandmarkProps) {
  return (
    <Frame {...p}>
      <rect x="30" y="40" width="60" height="56" fill={STONE} stroke={STONE_DK} strokeWidth="2" />
      <rect x="52" y="20" width="16" height="76" fill={STONE} stroke={STONE_DK} strokeWidth="2" />
      <path d="M52 20 L60 10 L68 20 Z" fill={NAVY} />
      {/* big arched entrance */}
      <path d="M54 96 v-16 a6 6 0 0 1 12 0 v16 Z" fill={NAVY} />
      {/* windows */}
      <rect x="36" y="52" width="8" height="16" rx="4" fill={GLASS} stroke={NAVY} strokeWidth="1" />
      <rect x="76" y="52" width="8" height="16" rx="4" fill={GLASS} stroke={NAVY} strokeWidth="1" />
      <circle cx="60" cy="34" r="4" fill={GOLD} />
    </Frame>
  );
}

// Harkness Tower — the iconic bell tower (a bonus, very recognizable Yale skyline).
export function HarknessTower(p: LandmarkProps) {
  return (
    <Frame {...p}>
      <rect x="48" y="24" width="24" height="72" fill={STONE} stroke={STONE_DK} strokeWidth="2" />
      <path d="M48 24 L60 6 L72 24 Z" fill={NAVY} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x="54" y={34 + i * 18} width="12" height="12" rx="6" fill={GLASS} stroke={NAVY} strokeWidth="1" />
      ))}
      {/* crown pinnacles */}
      <rect x="46" y="22" width="4" height="6" fill={NAVY} />
      <rect x="58" y="22" width="4" height="6" fill={NAVY} />
      <rect x="70" y="22" width="4" height="6" fill={NAVY} />
    </Frame>
  );
}

export interface LandmarkInfo {
  key: string;
  name: string;
  blurb: string;
  Component: (p: LandmarkProps) => JSX.Element;
}

export const LANDMARKS: LandmarkInfo[] = [
  {
    key: "bowl",
    name: "Yale Bowl",
    blurb:
      "The historic horseshoe stadium where the Bulldogs play football — and where The Game against Harvard roars to life.",
    Component: YaleBowl,
  },
  {
    key: "rink",
    name: "Ingalls Rink (“The Whale”)",
    blurb:
      "Eero Saarinen's whale-backed hockey rink, one of the most striking pieces of architecture on campus.",
    Component: IngallsRink,
  },
  {
    key: "som",
    name: "School of Management",
    blurb:
      "Edward P. Evans Hall — a light-filled, modern glass courtyard that's home to the Yale SOM community.",
    Component: SchoolOfManagement,
  },
  {
    key: "gym",
    name: "Payne Whitney Gymnasium",
    blurb:
      "The Gothic “Cathedral of Sweat,” one of the largest gyms in the world, towering over Yale athletics.",
    Component: PayneWhitneyGym,
  },
  {
    key: "beinecke",
    name: "Beinecke Rare Book Library",
    blurb:
      "A marble jewel box whose translucent stone panels glow, protecting some of the world's rarest books.",
    Component: BeineckeLibrary,
  },
  {
    key: "sterling",
    name: "Sterling Memorial Library",
    blurb:
      "The cathedral-like heart of Yale's libraries, where generations of students have studied under Gothic arches.",
    Component: SterlingLibrary,
  },
  {
    key: "harkness",
    name: "Harkness Tower",
    blurb:
      "The soaring bell tower whose carillon rings across Old Campus — an unmistakable Yale landmark.",
    Component: HarknessTower,
  },
];
