# Campus Customs — Design Notes

How the site is styled and why. The goal is a clean, modern shop that leans hard
into Yale — dark blue, an ivy/gold accent, a collegiate feel, and a friendly
mascot — while staying easy to read and easy to use.

## Visual identity

- **Colors.** Yale Blue (`#00356b`) is the primary color, with a darker navy for
  depth and a muted **gold** (`#bd9b60`) as the accent for highlights, hovers, and
  badges. Backgrounds are a soft off-white so navy cards and text pop.
- **Type.** A collegiate serif (Georgia) for a classic, Ivy-League feel.
- **Components.** Rounded cards with soft shadows, pill buttons, and a consistent
  navy header and footer tie the pages together.

## Handsome Dan & Yale landmarks (cartoons in code)

All illustrations are drawn as inline SVG (no image files), so they're crisp at any
size and easy to theme.

- **Handsome Dan**, the bulldog mascot, appears throughout: greeting shoppers on the
  home hero, thinking (chasing his tail) while the chatbot works, peeking from the
  bottom-left corner as you browse, playing fetch in the footer, and heading the
  recommendation sections. "As much Dan as possible."
- **Yale landmarks** — the Yale Bowl, Ingalls Rink ("The Whale"), the School of
  Management, Payne Whitney Gym, Beinecke and Sterling libraries, and Harkness
  Tower — are drawn in the same cartoon style. They sit as a faint watermark
  backdrop behind the cards throughout the site, and are showcased with short
  descriptions on the About page.

## Layout & standard polish

- **Sticky header.** The navigation bar stays fixed at the top as you scroll, so
  navigation is always one click away.
- **Always-present chat.** The chat button and panel are fixed to the bottom-right
  of the screen at all times, so shoppers never have to hunt for the assistant.
- **Scroll-to-top on navigation.** Moving to a new page (e.g. via a footer link)
  returns you to the top, so you always start where you expect.
- **Interactive affordances.** Nav items — including "Hi, [name]" and the Cart —
  show a gold underline on hover so it's clear they're clickable; the chat button
  lifts slightly on hover.
- **Readable chat.** The assistant's replies render light markdown (bold, bullet
  lists) rather than raw symbols.
- **Modals that behave.** The checkout and return pop-ups scroll inside the card and
  lock the page behind them, so a long form never scrolls the page underneath.
- **Browser tab icon.** A navy-and-gold "Y" favicon marks the tab.
- **Responsive & accessible.** Layouts reflow on small screens, and animations are
  disabled for users who prefer reduced motion.

## Colors as data (product filtering)

The Products page filters by each garment's **actual primary color** (the base of
the item, not text or graphic accents), consolidated from the catalogue's ~22 raw
color strings into a short, clean list (Navy, Gray, White, Blue, …) so the filter
is genuinely useful.
