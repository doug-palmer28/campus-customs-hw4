import {
  BeineckeLibrary,
  HarknessTower,
  IngallsRink,
  PayneWhitneyGym,
  SchoolOfManagement,
  SterlingLibrary,
  YaleBowl,
} from "./Landmarks";

// A faint, fixed layer of Yale landmarks behind all page content, so product
// cards and pages sit over a subtle Yale-campus backdrop. Purely decorative.
export default function LandmarkBackdrop() {
  return (
    <div className="landmark-backdrop" aria-hidden="true">
      <div className="lb lb-1"><HarknessTower size={150} /></div>
      <div className="lb lb-2"><YaleBowl size={170} /></div>
      <div className="lb lb-3"><BeineckeLibrary size={150} /></div>
      <div className="lb lb-4"><IngallsRink size={170} /></div>
      <div className="lb lb-5"><SterlingLibrary size={150} /></div>
      <div className="lb lb-6"><PayneWhitneyGym size={150} /></div>
      <div className="lb lb-7"><SchoolOfManagement size={160} /></div>
    </div>
  );
}
