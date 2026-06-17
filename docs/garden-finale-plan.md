# "Dorthes have" — the Finale Plan

How the garden-world reaches a **satisfying HUGE finale** without betraying its cozy, no-fail,
no-time-pressure feel. This is the design plan for the ending the whole journey builds toward
(small bed → ever-larger regions → finale → endless free-play).

**Grounded in research:** `~/cc/gamedev-kb/research/cozy-game-endings-and-finales.md` (deep-study
of Spiritfarer, Terra Nil, A Short Hike, Journey, Stardew, Animal Crossing, Unpacking, Cozy Grove).
This doc is the *application* of that research to Dorthe's garden; read the research doc for the
why and the sources.

**Audience reminder:** built for Mathias's mother (older adult) and family. Gentle, legible, no
fail-state, no countdown, no guilt. Stakes live in **meaning and transformation**, never in risk.

**Build the way the rest of the garden was built:** in tested milestones, and **playtest with
Dorthe between them** — only she can judge the *feel*; code tests only prove it works.

---

## The core idea (one sentence)

A cozy game has no danger to escape, so the ending can't come from "you survived." Dorthe earns
the finale by **accumulation crossing a warm, visible threshold**, and the finale lands because
**the world visibly changes state** — she stops *tending* and the whole garden *comes alive on its
own*, with the camera pulling back to reveal the entire journey at once. Then the garden becomes
hers to wander, forever.

---

## The seven principles, applied (priority order)

### ★ 1. The finale is a *different verb*, not a bigger number
Don't end with "the biggest grid full of the most flowers" — that just trails off. The finale is a
**one-time act Dorthe has never done before**: she stops tending and **releases the world**.
- **The finale sequence:** after the last region is grown, a gentle invitation appears. On accept,
  tending tools retire; a wave of wildlife (butterflies → birds → deer/wildlife) floods across the
  *whole* scene region by region; the camera pulls all the way back; the garden breathes by itself.
- The shift from *"I tend each plot"* → *"I watch the whole world live on its own"* **is** the arrival.
- Leans into the Terra Nil "nature takes over" feel the vision already cites.
- *Build: a scripted one-time scene reusing existing scene + particle + camera-pullback code in
  `js/garden-iso.js`. No new system.* **Feasibility: moderate.**

### ★ 2. Earn it by a visible threshold, never a difficulty wall
- Gate the finale behind a **warm, legible meter** — e.g. *"Haven er ved at vågne helt"* showing how
  much of the final region's life has returned. **Start it partly filled** (endowed progress — never
  start a bar at zero) and make it impossible to fail: only "not yet," never "you lost."
- No timer. Dorthe reaches it by tending at her own pace across one or several relaxed sittings.
- Frame the crossing like Animal Crossing's K.K. concert: **a celebration that also opens free-play**,
  not a door slamming shut.
- *Build: one threshold check on the existing `garden-logic.js` progress/economy state + a flag.*
  **Feasibility: cheap.**

### ★ 3. It's an *emotional* climax — plant the payoff early
- The emotional thread must be **personal**, not abstract. Use what's already here:
  - **Amigo** (the real family dog, already the in-scene guide) carries the through-line — "vi gror
    det her sammen."
  - Optional: 1–2 **named recurring visitors** who remember Dorthe across the journey.
  - **Family photos** (already on the wishlist) are the single strongest version of "make the payoff
    personal" — consider weaving them into the finale callback.
- **The finale must call back to the beginning:** briefly show the *tiny first bed* again, now nestled
  inside the huge living world, so she *feels* the distance travelled.
- **Gentle contrast (Journey, softened):** a brief quiet/wintry breath *just before* the bloom makes
  the burst of life land harder — a soft breath, **never** hardship or peril.
- *Build: mostly writing (Danish copy) + a callback scene reusing the earliest scene state.*
  **Feasibility: cheap–moderate.**

### 4. The world visibly *remembers* the journey
- The finale reveal = **the whole world visible at once** (the planned camera pull-back, turned into
  a deliberate finale moment): every region grown, every decoration placed, every visitor, in one
  panorama.
- Optional **"Havelog" lineage** Dorthe taps through: tiny bed → meadow → pond → orchard → forest —
  her journey retold through her *own* garden's growth (let her *tap through* it; don't just show a
  credits list).
- *Build: a camera/zoom pass over existing world state + an optional retrospective panel reusing
  existing region art.* **Feasibility: moderate.**

### 5. The ending is a *doorway to free-play*, not a wall
- After the finale fires, **do not lock the garden.** Unlock a calm free-play mode (the vision already
  plans "endless free-play after the ending"): free decoration with no economy pressure, season/
  day-night cycling to watch, all regions open to wander.
- Make the hand-off explicit and warm: **"Haven er din nu"** ("The garden is yours now"). The finale
  is Dorthe being *handed the keys*, not shown the exit.
- *Build: a saved `finaleSeen` flag that relaxes the economy and opens all content.* **Feasibility: cheap.**

### 6. Closure in *small repeated endings* along the way
- Each region the garden grows into should land as its own **mini-finale**: a short celebratory beat
  when the meadow first blooms, the pond first fills with life, the orchard first fruits — a warm
  sound, a gentle particle burst, a one-line note from Amigo, the camera easing back to reveal the
  new scale.
- These are **dress rehearsals**; the huge finale is the *same beat at maximum volume* across the
  whole world. (Reuse one "region complete" celebration as the finale's building block — same code,
  bigger payoff. Habituation rule: loud effect saved for the rare moment.)
- *Build: one reusable "region complete" celebration, scaled up for the finale.* **Feasibility: cheap.**

### 7. Let Dorthe *choose* to finish; never rush it
- Once the threshold (2) is reached, surface the finale as a **gentle, optional invitation** she can
  accept any time — a softly glowing element, e.g. *"Haven er klar til at blomstre helt op — tryk når
  du er klar"* — **not** an auto-trigger that yanks control mid-session.
- No countdown, no "you must finish today."
- *Build: a "ready" state + an opt-in button.* **Feasibility: cheap.**

---

## What we deliberately do NOT do (rejected patterns)

- **No real-time / daily-gated progression** (Cozy Grove / Animal Crossing overnight timers). It's a
  FOMO soft-grind that clashes with the no-grind/no-pressure values and with playing alongside Dorthe.
  The garden is **one unbroken journey**, playable in one or several relaxed sittings.
- **No anticlimactic / "fizzle" ending** (Spiritfarer's deliberately quiet endgame). Take the emotional
  *setup*, reject the decay — build *to* a peak.
- **No grading/score as the point** (Stardew's 19-point min-max). A finale must never read as "you got
  12/19" to an older-adult/child player. Borrow the *milestone*, drop the *grade*.
- **No hardship/peril contrast** (Journey's snowstorm). Take the gentle *quiet-before-bloom* breath
  only; never introduce danger or a fail-state.
- **No multiplayer/companion finale** (Journey's stranger) — needs a server; impossible in a vanilla
  no-build PWA and wrong for a single-player family game.

---

## Suggested build order (tested milestones — playtest with Dorthe between each)

1. **F1 — Region mini-finales (Principle 6).** Build the one reusable "region complete" celebration
   and wire it to each region unlock. *Cheap, and it's the finale's building block.* Playtest: does a
   region bloom *feel* like a small arrival to Dorthe?
2. **F2 — The finale threshold + invitation (Principles 2 & 7).** Add the warm, partly-filled,
   un-failable meter on the final region and the opt-in "ready when you are" invitation. *Cheap;
   reuses `garden-logic.js` state.*
3. **F3 — The finale sequence (Principles 1 & 4).** The release-the-world scene: tools retire,
   wildlife floods in across regions, camera pulls back to the full panorama. *The big moment;
   scale up the F1 celebration.*
4. **F4 — The emotional callback (Principle 3).** The tiny-first-bed callback + Amigo's through-line
   line(s) + the soft quiet-breath before the bloom. (Family photos = stretch goal here.)
5. **F5 — Free-play doorway (Principle 5).** `finaleSeen` flag → relax economy, open all regions,
   "Haven er din nu" hand-off. *Cheap; closes the loop so the ending opens instead of shuts.*

Files this will touch (per the current build): presentation/scene in `js/garden-iso.js` and
`js/garden.js`; progress/threshold in `js/garden-logic.js` (keep the tested core intact — add, don't
restructure); copy in the Danish strings; celebratory audio via `js/garden-music.js`; SW cache bump
in `sw.js` and `?v=` on edited assets (verify live after deploy).
