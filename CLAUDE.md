# TOHI Project Rules for Claude Code

## Project Identity

TOHI is a family-first theme park companion app starting with Walt Disney World.

TOHI is not a hardcore ride optimizer.

Core promise:
Help families make calmer, better park-day decisions by considering wait times, weather, walking distance, family energy, resort context, transportation, timing windows, and must-do priorities.

The app should help families make room for what matters most without turning the park day into a rigid checklist.

## Current Stage

TOHI is in a pre-field-test build phase.

The current goal is not broad feature expansion.

The current goal is:

1. Trust
2. Clarity
3. Stability
4. Field-test readiness
5. Mobile usability in real park conditions

Do not chase new features unless specifically requested.

## Current Roadmap Priority

We are currently working through the pre-field-test trust and clarity sequence.

Recent completed work includes:

* Plan tab state detection
* Morning Briefing
* transportation context
* rolling game plan
* in-park Plan tab focus
* Plan/Nudge trust guards
* Early Entry / Rope Drop separation
* Plan tab copy polish

Upcoming priority work:

1. Recommendation Card Clarity Pass
2. Debug Snapshot / Field Test View
3. Freshness / Refresh Behavior Pass
4. Must-do visibility pass
5. AI response test pack
6. Chat coherence pass
7. Mobile / field usability pass
8. While You Wait / mini-game content polish
9. Stabilization / field test freeze

## Architecture Rules

Deterministic recommendation logic drives the main cards and Plan tab.

AI explains and supports the deterministic plan.

AI must not invent a competing plan.

Do not change recommendation scoring unless Gabe explicitly asks for scoring changes.

Do not change:

* scoring values
* caps
* floors
* suppression gates
* must-do modifier values
* slot assignment logic
* AI/backend behavior

Unless explicitly requested.

Prefer small, targeted changes.

One issue per change.

Do not refactor unrelated files.

Do not rename files, move files, or reorganize architecture unless explicitly asked.

Do not “clean up” code outside the requested scope.

If a needed change appears outside scope, stop and flag it before editing.

## Required Workflow Before Editing

Before making any code changes, first explain:

1. What you believe the task is
2. Which files are involved
3. What risk the change carries
4. Whether the change touches scoring, AI, routing, storage, or schema
5. How the change should be tested manually
6. Whether this should be reviewed before implementation

If the change is broad, risky, or touches scoring/schema/AI, ask before editing.

## Required Workflow While Editing

Make the smallest safe change.

Preserve existing behavior unless the requested fix requires changing it.

Do not silently alter logic beyond the stated goal.

Do not add dependencies unless explicitly approved.

Do not introduce generated code blocks that are disconnected from the project’s current structure.

Use existing patterns in the codebase.

If adding helper functions, keep them small, named clearly, and deterministic.

If adding new output fields, make sure they are output-only unless explicitly intended to affect logic.

## Required Workflow After Editing

After editing, summarize:

1. Exact files changed
2. What changed in each file
3. What was intentionally not changed
4. Manual test steps
5. Any risks or assumptions
6. Whether build/test should be run
7. Whether Claude/Gabe should review before merge

Always include suggested git commands only after explaining what changed.

## Field-Test Priorities

Before field testing, prioritize:

1. Recommendation card clarity
2. Debug Snapshot / Field Test View
3. Freshness and refresh behavior
4. Must-do visibility
5. Correct active park / planning park / day phase logic
6. Mobile in-park usability
7. AI coherence with deterministic recommendations
8. While You Wait content quality
9. Stabilization freeze

Do not add large new intelligence before field testing unless Gabe explicitly chooses to do so.

## Recommendation Card Rules

Recommendation cards must explain why they exist.

Do not use generic filler like:

* “best available option”
* “based on current conditions”
* “recommended by the system”
* “high score”
* “optimized pick”

A card should explain the actual reason:

* lower wait than usual
* nearby
* good family fit
* indoor / heat-friendly
* better timing window
* must-do but bad timing
* too much walking right now
* weather makes it better or worse
* better later

If a recommendation is not explainable, it is not ready for field testing.

For Commit 42 specifically:

* The engine should emit structured explanation fields if needed.
* The card should render those fields.
* The card should not guess why something was selected.
* No scoring changes.

## Must-Do Rules

Must-dos are important family goals, not casual preferences.

A must-do should matter.

But a must-do should not automatically force a bad recommendation.

A must-do does not always mean “go now.”

If a must-do appears in Plan Ahead or Wait On This, the card must explain why now is not the right window.

Use this framing:

* “This is still important.”
* “Just not the right window.”
* “Watch for a better opening.”
* “This would cost too much right now.”
* “Better later.”

Do not make must-dos feel dismissed.

Future must-do work will include:

* completed must-dos
* skipped / not today
* pending must-dos
* goal tracking across the day
* surfacing must-dos when timing is right
* stopping nudges once completed

Do not build that system unless specifically requested.

## Early Entry / Rope Drop Rules

Early Entry and Rope Drop are separate concepts.

Early Entry:

* resort-eligible guests only
* usually about 30 minutes before official park open
* select lands/rides only
* must require eligibility context
* must require the correct timing window
* must never be assumed for all users

Rope Drop:

* official park opening
* available to all guests
* broader attraction access
* applies at regular park open

Never use Early Entry and Rope Drop interchangeably.

Never show Early Entry or Rope Drop nudges at night.

Never show Early Entry advice after its useful timing window.

If unsure, use cautious wording and require day-of verification.

## Active Park vs Planning Park Rules

Active park and planning park are different concepts.

Active park:

* where the family says they are right now
* drives live “Right Now” guidance

Planning park:

* what the Plan tab and trip plan are focused on
* drives must-dos and planning context

Do not blur these.

Must-do planning should follow planning park.

Live location guidance should follow active park.

If a change touches this boundary, call it out before editing.

## Freshness / Refresh Rules

Stale plan notices must be visible when the plan is stale.

Do not hide stale plan warnings in-park.

Refresh copy should be calm, not alarming.

Good:

* “Plan may need a quick refresh.”
* “Something important changed since this plan was last refreshed.”

Bad:

* “Warning”
* “Alert”
* “Your plan is wrong”

## Plan Tab Rules

Pre-trip:

* planning mode
* trip overview
* priorities
* game plan
* plan tune
* packing

Morning-of:

* send-off mode
* Morning Briefing
* first move
* getting there
* meaningful weather note
* priority preview

In-park:

* quiet reference
* Trip Status
* Plan Check if stale
* condensed priorities
* Worth Noticing if valid nudges exist
* rolling Day Strategy
* hide Plan Tune
* hide Packing
* avoid planning clutter

## TOHI Voice

TOHI should sound like a calm, experienced friend walking with the family through the park.

TOHI is warm, plainspoken, and steady.

TOHI should not sound like:

* an algorithm
* a corporate planner
* a ride optimizer
* a panic button
* a system status dashboard

## Avoid User-Facing Words

Avoid:

* protect
* protected
* protection
* optimize
* optimization
* execute
* override
* warning, unless safety-related
* alert, unless safety-related
* algorithm
* system
* scoring
* ranked
* rated
* best available option, unless followed by a specific reason
* based on current conditions, unless the actual condition is named
* TOHI should
* recommendation engine
* urgency unless truly warranted

## Preferred User-Facing Language

Use:

* making room for what matters
* good window
* worth noticing
* not yet
* better later
* this would cost too much right now
* good time to
* keep this flexible
* this is still on your list
* this is worth watching
* if you’re nearby
* earlier is safer
* confirm in the official Disney app

## Copy Rules

Short is better.

Use plain English.

Lead with the useful point.

Do not over-explain.

Never create fake certainty.

Never promise exact transportation timing.

Never say “leave at X time” unless that feature has been explicitly built and verified.

Never say something is official unless the metadata supports it.

## Testing Expectations

At minimum, after any code change:

1. Run build if possible.
2. Provide manual test steps.
3. Include key regression checks.
4. Mention which behavior should not have changed.

For trust-sensitive changes, test:

* morning
* midday
* evening
* in-park
* pre-trip
* stale plan
* must-dos present
* no must-dos present
* planning park different from active park

## Merge Discipline

Before merge, confirm:

* no scoring changed unless requested
* no AI behavior changed unless requested
* no unrelated files changed
* no user-facing banned language added
* no Early Entry/Rope Drop timing bug introduced
* no stale plan signal hidden
* no must-do priority dismissed without explanation

If in doubt, stop and ask Gabe.
