# 58A - TOHI Pick Readiness Audit

## Purpose

TOHI Pick is the premium "best move for your family right now" layer.

This commit is documentation/audit only. It does not change app behavior.

## Locked TOHI Pick direction

TOHI Pick is not another generic recommendation card. It should only appear when TOHI has enough signal to make a confident, family-specific pick.

TOHI Pick must not be:
- a renamed Best Move card
- a random highest-score label
- an AI-only answer
- a UI decoration
- a forced answer when confidence is low
- a replacement for normal recommendation cards in every scenario

## Required agreement model

The deterministic recommendation engine should narrow the best realistic candidates.

The AI agreement layer should review the same bounded family/day/context.

TOHI Pick should appear only when deterministic logic and AI judgment agree strongly enough.

If confidence is low, TOHI should fall back to normal recommendation cards or ask a soft clarifying question.

## Context TOHI Pick must use

TOHI Pick should consider these existing areas:

- Recommendation slots: Best Move, Smart Backup, Worth the Walk, Plan Ahead, Wait On This
- Family/profile: profile readiness, party size, ages, heights, pace, avoids, sensory needs, stroller/rider swap when available
- Must-dos: remaining must-dos, completed must-dos, skipped rides, reported issues
- Park/day: active park, planned park, park hopping, trip day, day phase
- Location: current area, GPS/location confidence when available, proximity to candidate rides
- Waits: wait time, ride status, freshness/source/fetchedAt/age metadata where available
- Weather: weather mode, provider metadata, rain/storm state, upcoming precipitation, feels-like temperature
- Activity: current in-line activity, completed rides, skipped rides, reported rides
- AI context: bounded top candidates with enough family/day context to agree or decline

## Important heat/weather rule

Florida heat is baseline operating context.

Heat should help break ties and protect against bad outdoor walking, but it should not send a family across the park for air conditioning when a nearby high-value ride also gives indoor relief at a manageable wait.

Nearby high-value manageable rides should generally beat farther low-wait filler.

## 58B eligibility helper requirements

58B should create deterministic readiness logic that answers:

Can TOHI Pick safely run right now?

Expected fields:
- eligible
- mode
- reasons
- missing

TOHI Pick should require:
- profile sufficiently complete
- active park known
- basic family constraints known
- usable wait data
- usable weather data
- candidate list available
- no blocking ambiguity

Do not show TOHI Pick when:
- profile is incomplete
- active park is unclear
- location is too weak and location matters
- wait data is stale or unusable
- candidate violates height, avoid, or access constraints
- candidate is closed or unavailable
- candidate was skipped or reported bad unless context says otherwise
- AI and deterministic engine disagree
- confidence is low
- two choices are too close and a soft question is better

## 58C candidate builder requirements

58C should create normalized TOHI Pick candidates from existing recommendation output.

Candidate fields should include:
- rideId
- name
- parkId
- area or land
- wait
- source slot
- engine reason
- engine caution
- must-do relevance
- weather fit or caution
- height/access eligibility
- completed/skipped/reported status
- indoor/outdoor/weather-sensitive tags
- confidence hints

58C must not rewrite recommendation scoring.

## 58D debug-only preview requirements

58D should expose TOHI Pick decisioning only in debug/dev context first.

Debug should show:
- eligibility result
- why eligible or ineligible
- candidate list
- candidate source slots
- engine top candidate
- AI agreement result if present
- final pick decision
- reason no pick

## 58E gated MVP card requirements

58E should add the public TOHI Pick card only when confidence is high.

The card should feel premium and personal, but it is not the full redesign arc yet.

Allowed user-facing language:
- best fit
- worth doing now
- better later
- good nearby move
- helps your plan
- keeps the day calm

Avoid user-facing language:
- score
- algorithm
- optimization
- model confidence

## Do not touch during 58A-58E

Do not drift into:
- Plan polish
- mini-game expansion
- recommendation scoring overhaul
- weather provider tuning unless required for TOHI Pick correctness
- proximity/weather retuning unless a live TOHI Pick blocker proves it
- premium redesign implementation before TOHI Pick MVP is stable

## Future redesign note

The approved premium redesign comes after TOHI Pick MVP is stable.

Redesign guardrails to preserve later:
- locked tabs: Home / Waits / Plan / TOHI / Profile
- day/night shared token system
- warm premium palette
- TOHI Pick as a premium featured card
- contextual mini-games only
- park/land/headliner artwork hierarchy
