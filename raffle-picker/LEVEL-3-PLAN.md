# Raffle Picker: Level 3 Plan (simplified)

## Constraints (locked)

- Jumbotron only. One big screen. No phones, no second-screen, no audience
  devices.
- No livestreaming, no OBS/NDI overlay output, no confidence monitor.
- No participant information is shown on screen, so no audit log or fairness
  ledger is needed.
- Must ship the same way the repo ships today: a self-contained folder
  (`raffle-picker/v3/`) served by GitHub Pages, no backend, no server-side build.
  Any implementation is fine as long as it runs that way on the jumbotron without
  lag.

## Maturity ladder (where this sits)

**Level 1 (shipped):** a single dependency-free HTML file. On-brand Classkick
lotto ball machine with churning balls (sticker + initials), a pull lever, a
shuffle, a ball that rolls to the tray, a winner card, podium, Winners Wall, CSV
export, live Google Sheet reading, WebAudio sound, fullscreen, and sample sizes.
Drops onto GitHub Pages or Netlify. 2D canvas.

**Level 2 (proposed, still a single file):** the level 1 build made
broadcast-grade. A suspense beat before the drop, the winning ball is the one you
watched churn, a cinematic full-screen reveal with a prize count-up, designed and
inlined audio, a guided operator run-of-show, kiosk mode, and accessibility.
Still 2D.

**Level 3 (this plan):** the same repo method (a `v3/` folder on GitHub Pages,
no backend), but the machine becomes a true 3D, near-photoreal glass cage with
real ball physics, plus the full cinematic show, running at a smooth framerate on
the jumbotron. The one real leap over level 2 is genuine 3D. Everything else
stays inside the single-folder, no-backend constraint.

## North star

The hall watches a real glass machine tumble on the jumbotron, the chosen ball
lights up and rises out, and the winner's initials land in a big celebratory
reveal. It feels like a real lottery draw, not a webpage.

## Pillars

### 1. Photoreal 3D machine (the core leap)

- Render with Three.js plus a physics library (Rapier or cannon-es), loaded as
  ES modules from a CDN or vendored into the `v3/` folder. No bundler required.
- A real glass dome, real rigid-body ball physics, contact shadows, and a moving
  camera (a slow push-in during the shuffle, a hero shot on the winning ball).
- The winning ball is one of the actual simulated balls. It is selected, lit, and
  tracked by the camera as it rises and exits. This fixes the level 1/2 problem
  where the ball that rolls out is a separate element, not the one you watched get
  picked.

### 2. Suspense and cinematic reveal

- A tension beat before the drop: the shuffle slows, the chamber spotlights, a
  drumroll, a "3, 2, 1."
- A full-screen reveal: the prize amount counts up ($0 to $1,000), big confetti,
  the winner's sticker + initials, readable from the back of the hall.

### 3. Designed audio, inlined

- Replace the synth beeps with designed sound: a real drumroll, ball rattle, a
  satisfying clunk on the lever, and a cheer on the win. Bundled into the folder
  so there is no network dependency or lag at showtime.

### 4. Operator run-of-show and kiosk (carried from level 2)

- One-button advance through intro, draw, confirm, next, podium.
- Presence confirm and redraw for no-shows, plus a result lock after the reveal
  so a stray keypress during applause cannot redraw.
- Fullscreen kiosk mode that hides all chrome.
- Identifying the winner to contact them stays exactly as today: the operator
  uses the existing private CSV export. The jumbotron still shows initials only.

### 5. Reliability on the jumbotron (the acceptance bar)

- A smooth framerate budget on the actual venue hardware. "Works with the repo
  method without lag" is the pass/fail test.
- A graceful enhanced-2D fallback if the venue machine cannot drive 3D smoothly.
- Vendor the 3D libraries, stickers, fonts, and audio into the `v3/` folder so it
  runs even if venue wifi is bad.

### 6. Accessibility

- A reduced-motion path, high contrast for a bright big screen, and a
  colorblind-safe ball palette.

## Architecture (stays repo-aligned)

- Ships as `raffle-picker/v3/` with an `index.html`, served by GitHub Pages
  exactly like v1 and v2. No backend, no server-side build.
- 3D libraries load via CDN ES modules (an import map) or are vendored as files
  in the `v3/` folder for offline safety. Either way it is still "open the folder
  URL and it runs."
- Reuse the existing data layer unchanged: Google Sheet reading, the frozen pool,
  the weighted pick, the podium, the Winners Wall, and the CSV export.

## Roadmap (all inside the single v3 folder)

- **Phase A, 3D machine:** stand up Three.js plus physics, a real glass dome and
  balls, the winning ball simulated, lit, and camera-tracked out to the tray.
  Wire it to the existing data layer.
- **Phase B, the show:** the suspense beat, slow-motion, the full-screen reveal
  with the prize count-up, and the inlined designed audio.
- **Phase C, hardening:** framerate tuning on the target screen, the 2D fallback,
  vendored assets, kiosk and run-of-show, and accessibility.

## Reality check

- 3D in a single repo-served folder is feasible with CDN or vendored libraries
  and no backend. The two real risks are framerate on the actual jumbotron player
  and CDN availability at the venue. Both are mitigated by vendoring the libraries
  and assets into the `v3/` folder and keeping the 2D fallback.
- If the venue hardware cannot hold a smooth framerate in 3D, the floor is an
  enhanced-2D version (better shading, contact shadows, motion blur on the
  current canvas), which still clears the bar.

## Decisions needed

- Near-photoreal or stylized 3D (how real should the glass and balls look)?
- Vendor the 3D libraries and assets into the repo (safest for venue wifi), or
  load them from a CDN?
- Target jumbotron resolution and the machine it plays from, so we can set the
  framerate budget.

## Success metrics

- Audience lean-in and cheers on the grand-prize drop.
- Zero failed draws, runs straight from the GitHub Pages URL (or fully offline),
  with no lag.
- Holds a smooth framerate on the venue hardware.
