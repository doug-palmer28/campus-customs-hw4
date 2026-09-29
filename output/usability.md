# Campus Customs — Usability Improvements (Problem 9)

Four improvements to the website and the shopping assistant. For each: a title,
what was added, and why it helps the shopper and/or the business.

---

## 1. Assistant helps you find your size

**What was added.** The chat assistant can now help a shopper figure out what size
to order. It uses the same size chart as the Size Guide page, walks the shopper
through measuring their chest in plain, encouraging steps, and then recommends a
size from their measurement (suggesting they size up if they're between sizes). It
can also confirm whether that size is in stock for a specific product.

**Why it helps.**
- *Shopper:* takes the guesswork out of sizing, so they order the right size the
  first time and feel confident taking their own measurements.
- *Business:* fewer wrong-size orders means fewer returns and exchanges, lower cost,
  and happier customers.

---

## 2. "Handsome Dan" thinking animation

**What was added.** While the assistant is working on a reply, a tiny Handsome Dan
(the Yale bulldog) spins in place chasing his tail, with a friendly "fetching your
answer…" caption — replacing the plain typing dots.

**Why it helps.**
- *Shopper:* a cute, on-brand moment makes the wait feel shorter and clearly signals
  that the assistant is working, reducing impatience.
- *Business:* a delightful touch encourages more people to use the chatbot; more chat
  usage means more customer questions and preferences captured, which gives us more
  insight to improve the store.

---

## 3. Account page: order history, returns, feedback, and recommendations

**What was added.** The "Hi, [name]" greeting in the nav now links to a personal
account page. There the shopper can:
- see their **order history** (what they bought, sizes, quantities, prices),
- **start a return** on any item with one click,
- leave **feedback** on each item — whether the fit was right and a 1–5 star rating,
- and browse **items recommended for them** based on what they've bought.

Checkout now records orders to the shopper's account (a demo checkout — no real
payment; we store only a dummy card's last four digits), so the history is real.

**Why it helps.**
- *Shopper:* an easy place to see exactly what they've ordered and to kick off a
  return without friction.
- *Business:* item-level feedback tells us about fit and satisfaction, and the
  personalized recommendations surface products a shopper might have missed —
  driving additional sales.

---

## 4. Cart "Complete the look" recommendations

**What was added.** The cart page now shows a "Complete the look" section suggesting
other items the shopper is likely to want. The suggestions are chosen to be:
- **in stock in the sizes the shopper is already buying**,
- **complementary** to what's in the cart (e.g. a jacket to layer over a tee), and
- matched on **affinity** — if the cart leans toward a specific residential college
  or sport, we suggest more items for that college/sport; if it's general Yale gear,
  we keep the suggestions general.

The same affinity-aware recommendation logic powers the account page's "Recommended
for you."

**Why it helps.**
- *Shopper:* helpful, relevant ideas that round out an outfit and surface items they
  may not have found on their own.
- *Business:* increases average order size and overall sales by putting the right
  additional products in front of the shopper at the right moment.

---

## 5. Yale Trivia Challenge — win a discount

**What was added.** A trivia game (linked from the footer and the cart) where a
**logged-in** shopper answers three Yale questions, each harder than the last. Get
all three right and they win a **one-time 10% coupon** with a unique, Yale-themed
code (e.g. `BOOLA-7K2Q9M`). The code drops into the coupon box at checkout for 10%
off. A shopper can hold **only one game coupon at a time** — they can win another
once they've used it.

**Why it helps.**
- *Shopper:* it's a fun, low-stakes game, and people love earning a real discount.
- *Business:* it builds **brand loyalty and affinity with Yale** — playing with Yale
  facts deepens the emotional connection to the brand, the reward gives a concrete
  reason to come back and buy, and gating it behind a login (and one coupon at a
  time) encourages account creation and repeat, single-use redemptions rather than
  runaway discounting.

## 6. Smoother, trackable returns

**What was added.** Starting a return now opens a short form asking **why** (wrong
size, damaged, changed mind, etc.) and requires the shopper to **certify the item is
clean, unworn, and still has its tags**. On submit they see a clear message that
they'll get a follow-up email with instructions (with a note that, as a class
project, no email is actually sent). The reason and certification are saved.

**Why it helps.**
- *Shopper:* a clear, guided return that sets expectations.
- *Business:* captures why items come back (invaluable for spotting sizing or quality
  issues) and records the cleanliness/tags certification up front.


## 7. Coupons at checkout

**What was added.** A coupon box in the checkout where a shopper can apply a valid
code and immediately see the discount reflected in the total. Codes are validated
against the shopper's own account and are single-use.

**Why it helps.**
- *Shopper:* a familiar, satisfying way to redeem a reward.
- *Business:* a controlled promotions mechanism (per-account, single-use) that drives
  conversions without uncontrolled discounting.


---

### How the recommendations decide "affinity" (shared with the harness)

Every product carries search tags (e.g. a "Davenport College Crewneck" is tagged
with its college; a baseball item with its sport). The recommender reads the tags of
the items in the cart or purchase history, ignores generic tags (like "Yale" or
"cotton"), and prefers other in-stock products that share the remaining, specific
tags — a college, a sport, or a school. When there's no specific signal, it falls
back to general Yale gear. It also favors complementary categories and only ever
suggests products that are actually in stock in the shopper's sizes.
