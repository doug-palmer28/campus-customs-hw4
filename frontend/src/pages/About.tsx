import { LANDMARKS } from "../components/Landmarks";

export default function About() {
  return (
    <div className="page about">
      <h1>About Campus Customs</h1>

      <p className="lead">
        Campus Customs is a Yale-inspired apparel shop built around one idea:
        showing your Bulldog pride should feel as good as it looks.
      </p>

      <p>
        We stock the staples that never go out of style — heavyweight crewnecks,
        cozy hoodies, game-day tees, and quarter-zips — alongside pieces that let
        you rep the specific part of campus you call home. Whether you're in a
        residential college, cheering on a varsity team, or celebrating a graduate
        or professional school, there's something here to make it official.
      </p>

      <p>
        Our approach blends timeless collegiate looks with modern comfort. Think
        soft cotton you'll wear on repeat, relaxed fits that layer easily, and
        graphics that keep a little bit of Yale close no matter where the years
        take you. From current students to lifelong alumni and the families who
        cheer them on, we design for everyone in the Bulldog community.
      </p>

      <h2>Made for the whole community</h2>
      <p>
        Yale spirit isn't just for game days. It shows up in a favorite sweatshirt
        on a cold New Haven morning, a tee passed down between siblings, and the
        mug that starts every alum's day. We aim to be the place you turn to for
        all of it.
      </p>

      <h2>The Yale we love</h2>
      <p>
        Our designs are inspired by the places that make Yale feel like home — from
        game days at the Bowl to late nights under the arches of Sterling. Here are a
        few of the campus landmarks we can't get enough of:
      </p>

      <div className="landmark-gallery">
        {LANDMARKS.map(({ key, name, blurb, Component }) => (
          <div key={key} className="landmark-card">
            <div className="landmark-art">
              <Component size={130} />
            </div>
            <h3>{name}</h3>
            <p>{blurb}</p>
          </div>
        ))}
      </div>

      <div className="callout">
        <strong>Heads up:</strong> This site is a student class project — a demo
        build, not a real store. It isn't affiliated with Yale University or the
        actual Campus Customs shop, and no real orders are placed here.
      </div>
    </div>
  );
}
