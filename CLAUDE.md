# Dorthe's Brain Games — project guide for Claude

A vanilla HTML/CSS/JS **PWA**: a collection of ~14 small games. A personal gift for
Mathias's mother (Dorthe). Danish UI, calm green theme, designed for older-adult usability.
Repo: `BordingCode/dorthe-braingames` (branch **master**), GitHub Pages.

## Before working on a game
Read the shared game-dev knowledge base: **`~/cc/gamedev-kb/INDEX.md`** (note: lowercase
`cc`). Especially `patterns/dom-screen-games.md`, `patterns/mobile-ios-safari.md`,
`patterns/audio-web-audio.md`, and `checklists/new-dom-game.md` + `checklists/ship-checklist.md`.

## The per-game contract
Each game `<id>` = `#screen-<id>` block in `index.html` + `css/<id>.css` + `js/<id>.js`.
`js/<id>.js` is an **IIFE** registering:
- `window.init<Id>` (open the screen / reset),
- `window.gameRestarters.<id>` ("Spil igen"),
- `window.gameCleanups.<id>` — **MUST cancel every timer/interval/rAF/listener and
  `timer.reset()`** (missing this leaked the `GameTimer` in 5 games).
Plus an entry in **`GAME_DEFS`** and **`ALL_GAMES`** in `js/shared.js`, and the files added
to `ASSETS` in `sw.js`.

## Use shared services (js/shared.js) — don't reinvent
`getAudioCtx()`, `playTone(freq,ms,type)`, `showResult(won,statsHtml,id)`,
`Stats.record/get/increment`, `showDifficultyModal(game,options,onSelect)` +
`getDifficulty/setDifficulty`, `class GameTimer`, `vibrate()`, `launchConfetti()`.
Use the tracked-`later()`/`clearTimers()` + `stopped`-flag pattern so deferred callbacks
never fire on the home screen.

## Every change MUST
- **Bump `CACHE_NAME`** in `sw.js` (e.g. `brain-games-v80`→`v81`) **and** the `?v=` query on
  changed `<link>`/`<script>` tags in `index.html` (format `?v=YYYYMMDD<letter>`). Otherwise
  old code is served — even your browser tests will pass on stale files.
- Keep sound **pleasant** (consonant scales, soft envelopes — never harsh).
- Keep it phone-first: `minmax(0,1fr)`+`min-width:0` grids, `100svh`, `touch-action`/
  tap-highlight/`user-select` on interactive elements, audio unlocked on a gesture.
- Be **tested in a real browser** (local `python3 -m http.server` + Playwright: init every
  screen, **0 console errors**, exercise cleanup). See the KB verification checklist.
- Be **committed and pushed** to `master` (Mathias wants every change committed + pushed).

## Notes
- Yatzy is an external game embedded via `<iframe>` (`bordingcode.github.io/yatzy`).
- `Round-e.jpg`, `Sharp-e.jpg`, `Sudoku_inspiration.jpg`, the `yatzy` symlink are pre-existing
  untracked items — leave them.
- localStorage keys: `bg_stats_<id>`, `bg_diff_<id>`, `bg_achievements`, `bg_player_name`.
