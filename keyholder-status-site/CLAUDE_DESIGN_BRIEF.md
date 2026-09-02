# Keyholder — public status page: brief for Claude Design

## What this is
A single static webpage (no backend, no framework — plain HTML/CSS/JS, hosted on GitHub Pages)
that shows a person's live chastity-lockup status, publicly viewable by anyone with the link.
It's fed by an Android app ("Keyholder") that pushes small JSON files to this same repo
whenever a lockup starts, ends, or on a daily heartbeat. The page reads those JSON files and
renders them — nothing here talks to a server beyond fetching static files.

This is a **companion piece to a private, personal app** — the tone should read as clean and
matter-of-fact, not marketing-flashy. Think "a well-made personal status dashboard," not
"landing page."

**Content-wise this is meant to be a web version of the app's own share infographic** — same
pieces (status, stats, milestones, who's involved, history), just reflowed for a persistent
webpage instead of a one-off shared image. Feel free to depart from the infographic's exact
visual composition; the content parity is what matters, not matching its layout.

## Current structure (functional, needs visual polish)
1. **Status** (top, the clear focus of the page) — either a live-ticking "locked since" clock
   with the start date/time, or a plain "not currently locked" state.
2. **Profile** — two optional blocks: "Locked by" (the page owner's name + social links) and
   "Keyholder" (the keyholder's name + social links). Each link shows a small platform icon
   (X, Bluesky, Recon, Instagram — icon files included) or a plain custom label for anything
   else.
3. **Stats** — 5 tiles: sessions, current streak, longest, average, all-time total. Computed
   client-side in JS from the same status/history data (mirrors the app's own stat logic
   exactly, including folding the still-running session into total/longest/streak — not just
   completed sessions). Live-ticks alongside the clock.
4. **Milestones** — a row of 7 badges (24h → 1yr), same thresholds as the app, lit up once
   reached. Only shown while currently locked, matching the app.
5. **History** (below, secondary) — a list of past sessions, each showing start date/time, end
   date/time, total duration, and an optional reason if one was given.
6. A small footer showing when the data was last confirmed (and flags itself if it looks stale
   — no heartbeat in 36+ hours).

## Theme — must match an existing Android app
Black/red "vault" palette, already defined as CSS variables in `style.css`:
- Background: `#000000`, panels: `#160607` / `#200A0C`, panel border: `#3D161B`
- Primary accent: `#E4002B`, secondary: `#6E0016`, highlight: `#FF3B57`
- Text: `#F5EEEE` primary, `#B08D91` secondary

Keep these — the point is visual consistency with the app, not a new palette. Feel free to
adjust spacing, typography, layout, and polish within that palette.

## Icons
`icons/x.png`, `icons/bluesky.svg`, `icons/recon.png` are the real platform assets (not
generic placeholders) — X is a white glyph on transparent (works on dark backgrounds as-is),
Bluesky is their actual blue butterfly mark, Recon is their full-color icon. Render these at
their native colors, don't recolor/tint them — that's deliberate, matches how the Android app
treats them.

## What's explicitly out of scope
- No backend, no build step, no framework/bundler — has to stay deployable by literally
  copying files into a GitHub repo and enabling Pages. Plain HTML/CSS/JS only.
- No analytics, no third-party scripts, no external font/CDN calls unless truly necessary
  (privacy-conscious, keep it self-contained).
- Not mobile-only — should read well on both a phone (most likely viewing context, since it's
  linked from a phone app) and desktop.

## The ask
Take `index.html` / `style.css` / `app.js` as the functional baseline (don't need to preserve
the exact DOM structure, just the behavior — live clock, profile block, history list, staleness
footer) and make it look genuinely well-designed rather than "functional first draft." Current
lockup status should stay the clear visual focus; history is secondary, below it.
