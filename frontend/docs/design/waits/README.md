# Approved Waits redesign blueprints

These four exports are the **implementation source of truth** for the Waits tab
redesign. When an implementation decision and one of these images disagree, the
image wins — or the change stops and gets re-approved. Nothing here may be
recreated, reinterpreted, cropped, resized, or recompressed.

| File | Shows | Size |
|---|---|---|
| `waits-approved-healthy-day.png` | Healthy Waits screen, day mode | 860 × 3000 |
| `waits-approved-healthy-night.png` | Healthy Waits screen, night mode | 860 × 3000 |
| `waits-approved-states-day.png` | Secondary-state reference sheet, day mode | 1000 × 3841 |
| `waits-approved-states-night.png` | Secondary-state reference sheet, night mode | 1000 × 3842 |

The two healthy concepts are a single phone screen each. The two state sheets are
specification sheets covering the eight exceptional states.

## What this blueprint is, and is not

- The blueprint is **visual guidance, not proof that every represented state
  already exists** in the application.
- **Browsed-park loading and error are intentionally marked as not yet
  implemented.** The current build cannot distinguish them from an empty result.
- **Existing behavior must be extracted and protected before the visual redesign
  begins.** The presentation move comes first, with render parity proven, exactly
  as Home was handled.
- **Production implementation must use real current data and existing
  interaction handlers.** No invented fields, no new data sources, no
  reimplemented actions.

## Locked decisions

### Structure and chrome

- Waits remains **text-led; no ride artwork**.
- **One clear page header.** Do not retain the duplicate Waits headers that ship
  today.
- **No decorative circles, corner blobs, or legacy glows.**
- **No fake search, filter, sorting, dropdown, notification bell, or chevron
  controls.** None of these have real behavior behind them.
- **No attraction-count tile.**

### Healthy attraction cards

- Healthy attraction cards use the **approved compact layout**.
- Attraction actions remain exactly: **In Line**, **Done**, **Skip**,
  **Report Issue**.
- Actions use the **approved 2×2 grid**.

Locked healthy-card measurements, taken from the approved concept:

| Property | Value |
|---|---|
| Attraction name | 17.5px |
| Wait value | 42px |
| Card radius | 26px |
| Card padding | 20px |
| Action height | 48px |
| Actions | 2×2 grid |

### Showtimes

- Showtime attractions use **one Showtimes status pill** and the approved
  **Typical Showtimes** panel.
- Exact caution copy:

  `Verify in My Disney Experience. Showtimes can change by day.`

### Browsing another park

Browsing another park is **informational only**:

- show `VIEWING ONLY`
- hide all four actions
- hide showtimes

### Loading, refresh, and failure

- **Initial loading** uses card-shaped skeletons and **does not invent
  attraction data**.
- **Refreshing with existing data retains the visible cards.** Usable data is
  never replaced by skeletons or a blank list.
- **Refresh failure with existing data** retains the cards and uses:

  `Couldn’t refresh wait times. Showing the last available data.`

- During that refresh-error state, **omit the freshness pill entirely**. Do not
  show `Live` and do not show `Status unknown`. The message already states that
  the screen is showing the last available data, so any pill would add an
  unsupported freshness claim.

### Error with no data

- heading: `Wait times unavailable`
- copy: `We couldn’t load wait times right now. Try refreshing in a moment.`

The existing header Refresh control is the recovery action. Do not add a second
Try Again button.

### Valid empty state

- heading: `No attractions to show`
- copy: `No attractions are available for this park right now.`

This is not an error and must never describe the park as closed, or claim that
every attraction is closed.

### Browsed-park loading and error

- Browsed-park loading copy: `Loading EPCOT wait times…`
- Browsed-park error copy: `EPCOT wait times are unavailable right now.`

**The app must gain separate browsed-park loading and error state during
implementation. An active-park error must never be presented as the browsed
park's error.**

### Attraction-card variants

- **Closed** and **unavailable** waits display `--` with the existing `wait` unit
  treatment. **Never invent a wait time.**
- **In Line Now** keeps the approved calm emphasis and **disables only the In
  Line action**. Done, Skip, and Report Issue remain available.

### Day and night

- **Night mode uses deep navy surfaces, not pure black.**
- **Day and night preserve identical structure and spacing; only presentation
  tokens change.** Both state sheets render from one markup source for this
  reason.

## Canonical example names

Example names used in any Waits reference or fixture must match production data
exactly, including straight apostrophes:

- `Soarin' Around the World`
- `Mickey & Minnie's Runaway Railway`
- `Rock 'n' Roller Coaster Starring The Muppets`

**Never use Muppet*Vision 3D as a Waits example**, because production filters it
out. `attractionDisplayFilters.js` excludes it by the exact strings
`Muppet*Vision 3D` and `MuppetVision 3D`, and again by a `/muppet\*?vision/i`
regex. It can never appear in a real Waits list.

## The sheets are documentation

The reference-sheet labels, state numbers, and implementation notes are
**documentation surrounding the simulated UI. They must never become app UI.**
On the sheets they sit deliberately outside every simulated screen area, on a
neutral ground that is not the app background.
