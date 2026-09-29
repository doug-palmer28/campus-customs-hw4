// Handsome Dan — Yale's bulldog mascot, drawn in inline SVG (per project
// guidance to implement creatures in HTML rather than image files).
// A cheerful, cream-colored English bulldog with a Yale-blue collar.

export default function Bulldog({
  size = 180,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={`bulldog ${className}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="Handsome Dan, a happy Yale bulldog"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ears */}
      <ellipse cx="52" cy="66" rx="20" ry="26" fill="#7a5c43" transform="rotate(-18 52 66)" />
      <ellipse cx="148" cy="66" rx="20" ry="26" fill="#7a5c43" transform="rotate(18 148 66)" />
      <ellipse cx="54" cy="70" rx="12" ry="17" fill="#8f6f52" transform="rotate(-18 54 70)" />
      <ellipse cx="146" cy="70" rx="12" ry="17" fill="#8f6f52" transform="rotate(18 146 70)" />

      {/* Head */}
      <path
        d="M100 40
           C55 40 42 74 42 104
           C42 140 68 166 100 166
           C132 166 158 140 158 104
           C158 74 145 40 100 40 Z"
        fill="#f3e7d6"
        stroke="#d9c4a6"
        strokeWidth="2"
      />

      {/* Cheeks / jowls */}
      <ellipse cx="74" cy="132" rx="30" ry="26" fill="#faf1e4" />
      <ellipse cx="126" cy="132" rx="30" ry="26" fill="#faf1e4" />

      {/* Brown patch over one eye */}
      <path
        d="M118 70 C140 66 150 82 148 100 C138 104 122 100 116 92 Z"
        fill="#c79a6b"
        opacity="0.7"
      />

      {/* Eyes (happy) */}
      <circle cx="76" cy="96" r="10" fill="#ffffff" />
      <circle cx="124" cy="96" r="10" fill="#ffffff" />
      <circle cx="78" cy="98" r="5.5" fill="#2b2118" />
      <circle cx="122" cy="98" r="5.5" fill="#2b2118" />
      <circle cx="80" cy="96" r="1.8" fill="#ffffff" />
      <circle cx="124" cy="96" r="1.8" fill="#ffffff" />

      {/* Brows for a cheerful look */}
      <path d="M64 84 Q76 78 88 84" stroke="#b89b78" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M112 84 Q124 78 136 84" stroke="#b89b78" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Muzzle + nose */}
      <ellipse cx="100" cy="124" rx="24" ry="18" fill="#fff8ef" />
      <ellipse cx="100" cy="114" rx="12" ry="9" fill="#2b2118" />
      <ellipse cx="96" cy="112" rx="3" ry="2" fill="#5a4a3a" />

      {/* Happy open smile with tongue */}
      <path
        d="M80 130 Q100 150 120 130"
        stroke="#2b2118"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M92 138 Q100 156 108 138 Z"
        fill="#e8788a"
        stroke="#d9647a"
        strokeWidth="1.5"
      />

      {/* Yale-blue collar */}
      <path
        d="M62 160 Q100 178 138 160 L134 170 Q100 186 66 170 Z"
        fill="#00356b"
      />
      <circle cx="100" cy="171" r="6" fill="#bd9b60" />
    </svg>
  );
}
