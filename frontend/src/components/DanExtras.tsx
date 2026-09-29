import Bulldog from "./Bulldog";

// A little tennis ball for Handsome Dan to chase.
export function TennisBall({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="17" fill="#d7e04a" stroke="#b7c22e" strokeWidth="2" />
      <path d="M6 12 Q20 22 8 33" fill="none" stroke="#ffffff" strokeWidth="2.5" />
      <path d="M34 12 Q20 22 32 33" fill="none" stroke="#ffffff" strokeWidth="2.5" />
    </svg>
  );
}

// Handsome Dan happily playing fetch — Dan plus a bouncing ball.
export function DanFetch({ size = 56 }: { size?: number }) {
  return (
    <span className="dan-fetch" aria-label="Handsome Dan playing fetch">
      <Bulldog size={size} />
      <span className="dan-ball">
        <TennisBall size={size * 0.4} />
      </span>
    </span>
  );
}

// A small Handsome Dan peeking up from the bottom-left corner — a friendly
// "hidden Dan" that's always on screen as you browse.
export function PeekingDan() {
  return (
    <div className="peeking-dan" aria-hidden="true" title="Handsome Dan is watching!">
      <Bulldog size={78} />
    </div>
  );
}
