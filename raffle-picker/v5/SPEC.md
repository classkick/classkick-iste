# Raffle Picker v5: Implementation Spec

v5 is a copy of `../v4/` (3D machine + funk music) with a single behavior change:
**winners are no longer removed from the pool.** Everyone stays eligible for every
prize; if the machine draws someone who already won, the operator simply redraws.

Everything else (3D machine, physics, audio, reveal, podium, Winners Wall, CSV
export, Settings/sheet layer) is identical to v4. See `../v3/SPEC.md` for the full
machine spec.

## Behavior change vs v4

In v4, `confirmWinner()` called `removeFromPool()`, so each winner was taken out
of `state.pool` and could not win a later, higher prize. Because prizes are drawn
smallest first (3rd -> 2nd -> 1st), winning 3rd made you ineligible for 2nd/1st.

In v5, winners stay in the pool and remain eligible for every prize. Duplicates are
handled by the operator, not by removing entrants.

## Code changes (all in `v5/index.html`)

1. **`confirmWinner()`** - removed the `removeFromPool(state.pending)` call. The
   winner is recorded in `state.winners` but stays in `state.pool`.

2. **`reveal(entrant)`** - if the drawn entrant already appears in `state.winners`
   (matched by `w.entrant === entrant`), the reveal card shows a warning badge:
   `⚠ Already won <medal> <place> — redraw?`. Confirming is still allowed; the
   operator decides whether to let it stand or click Redraw.

3. **`isLastDraw()`** - no longer subtracts one from the pool length (awarding a
   prize no longer shrinks the pool). "Last draw" is now driven by prizes
   remaining, with the empty-pool case still guarded.

4. **CSS** - added `.wincard .dupwarn` (amber pill) for the repeat-winner badge.

## Unchanged supporting behavior

- **Redraw** (`redraw()`) still removes the currently drawn entrant from the pool
  before re-drawing the same prize. This is the mechanism for skipping a repeat
  winner (or a no-show): the flagged person already has their prize, so dropping
  them from later draws is correct.
- **Un-award** from the prize chips (`selectPrize()` re-draw) still clears a win.
  Its "put them back in the pool" guard (`indexOf(entrant) < 0`) is a no-op now
  because the winner was never removed, so it will not double-add.

## Operator workflow

Draw as normal (3rd -> 2nd -> 1st). If a reveal card shows the "Already won" badge,
click **Redraw** to pick a different entrant for that prize; the earlier win is
untouched. If you want to allow the same person to win twice, click Next instead.
