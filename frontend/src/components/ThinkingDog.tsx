import Bulldog from "./Bulldog";

// Shown while the agent is thinking: a tiny Handsome Dan spinning after his tail,
// so the shopper has something cute to watch and knows the bot is working.
export default function ThinkingDog() {
  return (
    <div className="thinking-dog" aria-label="Handsome Dan is thinking">
      <div className="thinking-dog-spin">
        <Bulldog size={44} />
      </div>
      <span className="thinking-dog-text">Handsome Dan is fetching your answer…</span>
    </div>
  );
}
