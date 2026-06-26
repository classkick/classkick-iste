# Raffle Picker v3: Implementation Spec

Implements the simplified Level 3 plan (`../LEVEL-3-PLAN.md`): a true 3D glass
ball cage on a jumbotron, shipped as a `raffle-picker/v3/` folder on GitHub
Pages, no backend, no server-side build. Reuses the v2 data layer unchanged.

## 0. Assumptions (defaults, override if needed)

- **Stylized-real 3D**, not hyper-photoreal: glossy brand-colored balls, a clean
  glass dome with fresnel rim and reflections, no heavy refraction. Matches the
  Classkick brand and protects framerate.
- **Three.js for rendering + custom 3D physics** ported from the v2 canvas. No
  physics library (fewer deps, trivial to vendor, full control, and the v2 physics
  already works). cannon-es/Rapier noted as an optional later upgrade.
- **Vendored libraries** (Three.js) live in `v3/lib/` so it runs even on bad
  venue wifi. A CDN import map is the dev-time alternative.
- **Framerate budget:** 60fps at 1920x1080. Design scales to 4K with a capped
  pixel ratio. If the venue machine cannot hold it, fall back to the v2 2D
  machine (see section 9).
- One screen (jumbotron). Operator drives via keyboard/clicker on that machine.
  Initials only on screen; winner identity stays in the existing CSV export.

## 1. Files (all static, served by GitHub Pages exactly like v1/v2)

```
raffle-picker/v3/
  index.html        markup + inline CSS + import map + one inline module script
  lib/
    three.module.js vendored Three.js (r160+)
  assets/
    sfx/            designed audio (drumroll, rattle, clunk, cheer) as .mp3/.ogg
```

- Single `index.html` like v1/v2 (inline CSS and a single
  `<script type="module">`). The only external module is Three.js, pulled through
  an import map.
- Note: ES module imports do not work from `file://`. Run via the existing
  `python3 -m http.server` locally; GitHub Pages serves over http so production is
  fine. (Same workflow we already use to verify v1/v2.)

```html
<script type="importmap">
  { "imports": { "three": "./lib/three.module.js" } }
</script>
<script type="module">
  import * as THREE from "three";
  /* app code */
</script>
```

## 2. Reuse from v2 (copy verbatim, do not rebuild)

Copy these from `v2/index.html` into v3 unchanged. They have no rendering
coupling:

- Sheet layer: `toCsvUrl`, `parseCSV`, `loadFromUrl`, the Settings panel + column
  mapping, `generateSample` and the sample-size selector.
- Data model: `state`, `buildPool`, `weightedPick`, `PRIZES`, `initials`,
  `maskEmail`, `STICKERS` / `stickerUrl` / `pickStickerName` / `pickEmoji`,
  `cryptoFloat`.
- Outcome UI: the winner card, `confirmWinner`, `redraw`, `selectPrize`, the
  podium, the Winners Wall, `exportWinnersCSV`, `recordRun`, confetti.
- Controls: Settings, prize chips, mute, fullscreen, Start over, the gear/C
  overlay.

Replace only the machine: the 2D canvas renderer, `makeBalls`/`stepMachine`/
`drawBall`, the DOM `outball` roll-out, and the `draw()` timing. Those become the
3D module below.

## 3. 3D scene

Single full-viewport `<canvas>` behind the existing DOM chrome (header, prize
rail, status, controls, reveal card all stay DOM on top).

- **Renderer:** `WebGLRenderer({ antialias:true, alpha:true })`,
  `setPixelRatio(Math.min(devicePixelRatio, 2))`, `outputColorSpace = SRGB`,
  ACES tone mapping. Transparent clear so the existing brand background shows.
- **Camera:** `PerspectiveCamera`, fov ~35, positioned for a centered hero
  framing of the dome.
- **Lighting:** one key directional light (casts a soft shadow or a blob shadow
  under the base), a fill, and a low-cost environment map (a generated gradient
  env or a small bundled HDR) so the glass and balls have reflections.
- **Glass dome:** a sphere with `MeshPhysicalMaterial` (low roughness, a little
  transmission or just transparency + a fresnel rim via env reflections). Stylized,
  not full refractive transmission, for framerate.
- **Base + neck + tray:** brand-green meshes echoing the v2 silhouette. A dark
  "hatch" hole at the dome bottom where the ball exits.
- **Balls:** one `SphereGeometry` shared; per-ball `MeshStandardMaterial` in the
  brand palette (glossy). Each ball carries the entrant's sticker + initials via a
  **camera-facing Sprite** child (so the label is always readable regardless of
  ball spin). The sprite texture is a `CanvasTexture` generated once per ball by
  reusing the v2 `drawBall` 2D logic (sticker clipped + initials with white halo).
  Generate textures once at `setBalls`, never per frame.
- **Shadows/contact:** prefer a cheap blob shadow plane under the pile over full
  shadow mapping if shadows cost too much.

### Machine module API

```
initMachine(canvas)             set up renderer/scene/camera/lights/dome/base
setBalls(entrants)              build up to BALL_CAP ball meshes + sprites
stepMachine(dt)                 physics + render (called from the rAF loop)
setChurn(level) / setGravity(g) tunables (idle vs shuffle)
tossBalls()                     impulse on the pull
extractWinner(entrant) -> Promise  choose/relabel a ball, light it, dim the rest,
                                drive it up through the neck and out to the tray,
                                resolve when it lands
setShot('idle'|'shuffle'|'hero')   tween the camera between framings
resize()                        on window resize
```

## 4. Physics (3D port of the v2 canvas physics)

Same model as v2, extended to 3D, run in a fixed-radius sphere. No library.

- Per ball: `pos`, `vel` (Vector3), `r`.
- Each step: `vel.y -= gravity`; add random agitation scaled by `churn` on all
  three axes; integrate; damp (~0.988).
- **Ball-ball separation:** O(n^2) over <= 60 balls (about 1,800 pairs, cheap):
  if centers closer than `r_i + r_j`, push apart and exchange a little velocity
  (port of the v2 separation pass).
- **Spherical wall:** if `|pos - center| > R - r`, clamp to the shell and reflect
  velocity along the normal (port of the v2 circular-wall clamp, now 3D).
- **Pull burst:** `tossBalls()` adds a strong upward + random impulse; `draw()`
  spikes `churn` and `gravity` and re-erupts a few times across the shuffle (port
  of the v2 values, retuned for 3D).
- Tunables surfaced as constants at the top, like v2: `BALL_CAP` (60), idle vs
  shuffle `churn`/`gravity`, toss magnitude, damping, restitution.

### Winner ball selection + extraction

1. `weightedPick()` picks the winner from `state.pool` (existing, fair).
2. If that entrant has a ball on screen (pool <= cap), use it. Otherwise relabel
   one arbitrary ball with the winner's sticker + initials just before extraction
   (the audience cannot track one identity among 60 churning balls).
3. `extractWinner`: ease `churn`/`gravity` down, dim and desaturate the other
   balls, spotlight the chosen ball, then guide it (an upward steering force or a
   short tween) up through the neck and out the hatch to the tray. Camera tweens to
   the hero shot and tracks it. Resolve the Promise on landing, which triggers the
   reveal.

This is the fix for the v1/v2 "the ball that rolls out is not the one you
watched" problem: extraction acts on a real simulated ball.

## 5. Run-of-show state machine

Phases: `idle -> pull -> shuffle -> extract -> reveal -> confirm -> (next | podium)`.

- `idle`: gentle churn, lever pulsing, `setShot('idle')`.
- `pull` (lever click / Space / clicker): lock input, `setShot('shuffle')`,
  `tossBalls()`, spike churn+gravity, start audio.
- `shuffle`: violent storm for ~2s with re-erupts.
- `extract`: `extractWinner(winner)` (section 4), camera to hero.
- `reveal`: full-screen DOM card (section 6).
- `confirm`: Next advances and re-seats the chamber with one fewer ball; Redraw
  discards and re-runs the same prize.
- After the last prize: podium (reused from v2).
- **Result lock:** once revealed, ignore draw inputs until Next/Redraw, so an
  applause keypress cannot redraw.
- **Kiosk:** controls hidden behind the gear/C overlay (as v2); add a confirm or
  hidden gesture to exit fullscreen so it cannot be left by accident.

## 6. Reveal and podium

- Keep these as DOM over the 3D canvas (crisp text, cheap): reuse the v2 winner
  card and podium, scaled up for the hall.
- Add a **prize count-up** ($0 to the amount) on reveal and a bigger confetti
  burst. Winner card still shows sticker + initials only.

## 7. Audio (designed, bundled)

- Replace the WebAudio synth with bundled clips in `assets/sfx/`: a drumroll bed
  for the shuffle, ball rattle, a clunk on the pull, a cheer + sting on the win.
  Preload and play via `HTMLAudioElement` or WebAudio buffers. First sound on the
  lever click satisfies the autoplay gesture rule.
- Keep the existing mute toggle. Cues mapped to phases: pull -> clunk; shuffle ->
  drumroll + rattle; extract -> rising whoosh; reveal -> cheer + sting; podium ->
  fanfare.

## 8. Performance budget

- 60fps at 1080p. `setPixelRatio(min(dpr, 2))`. <= 60 balls. Shared geometry,
  per-ball material/texture created once. No per-frame allocations in the step
  loop (reuse temp vectors). Frustum culling on. Dispose meshes/textures on
  re-seat.
- Prefer blob shadow over shadow maps if maps cost more than ~2ms.
- Cap the environment map size; bake or generate once.

## 9. Adaptive quality and 2D fallback

- On boot, feature-detect WebGL2. If absent, load the v2 2D machine instead
  (iframe `../v2/` or a shared 2D path) so the draw still happens.
- Runtime watchdog: if measured frame time stays above ~22ms for 2s, step down
  quality (drop shadows, lower pixel ratio, simpler glass); if still bad, fall
  back to the 2D machine. Never let the show stutter.

## 10. Accessibility

- Respect `prefers-reduced-motion`: skip the long shuffle, settle quickly, no
  camera moves.
- High-contrast, colorblind-safe ball palette; `aria-live` announcement of the
  winner's initials; keyboard-only operable (Space draw, Enter confirm).

## 11. Build order (Phase A first)

**Phase A: the 3D machine**

1. Create `v3/index.html` by copying v2 and removing the 2D machine code; vendor
   Three.js into `v3/lib/`.
2. `initMachine` + render loop: dome, base, lights, env, empty chamber.
3. `setBalls` + per-ball sprite textures (reuse `drawBall`); wire to
   `renderWheel`/`state.pool`.
4. Port physics (gravity, agitation, separation, spherical wall, toss).
5. `extractWinner` + camera shots; wire `draw()` to the new state machine; reveal
   via the existing card.
   Acceptance: balls tumble in 3D at 60fps, the lever draws, the chosen ball is
   lit and tracked out, the winner card shows correct sticker + initials, and the
   podium/Wall/CSV still work.

**Phase B: the show**

6. Suspense beat (slow-mo, spotlight, 3-2-1), full-screen reveal + prize
   count-up, bundled designed audio mapped to phases.
   Acceptance: a clear tension-to-payoff arc with designed sound, readable from the
   back of a hall.

**Phase C: hardening**

7. Framerate tuning on the target resolution, adaptive quality + 2D fallback,
   vendored assets (Three.js, sfx, optionally stickers/fonts) for offline, kiosk
   - run-of-show locks, accessibility.
     Acceptance: holds 60fps on the venue hardware, runs offline from the folder,
     cannot be broken by a stray keypress, and degrades gracefully.

## 12. Risks and mitigations

- **Framerate on venue hardware:** mitigated by the budget, adaptive quality, and
  the 2D fallback.
- **Glass cost:** stylized glass (no full transmission); drop to a simpler shell
  if needed.
- **CDN/wifi at venue:** vendor Three.js + audio (+ optionally stickers/fonts)
  into the folder.
- **file:// during dev:** serve over http (existing workflow).

## 13. Out of scope (per the simplified plan)

No phones/second-screen, no backend, no livestream/overlay output, no confidence
monitor, no audit log, no productization/multi-language.
