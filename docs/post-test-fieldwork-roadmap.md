# TOHI Post-Test Fieldwork Roadmap

This document preserves the post-test cleanup roadmap from real in-park field testing at Walt Disney World.

These are not theoretical ideas. They are fieldwork findings from actual use of TOHI in the parks. The purpose of this document is to keep the evidence, context, and fix direction together before we start changing app behavior.

This commit must be documentation-only.

## Current commit goal

Commit message:

- docs: add post-test fieldwork roadmap

File:

- docs/post-test-fieldwork-roadmap.md

This document captures the 22 post-test findings and fixes, plus one additional AI comparison issue and one positive behavior pattern to preserve.

## Product principle from fieldwork

The biggest lesson from testing is that TOHI earns or loses trust in the moment.

A family will forgive imperfect strategy if TOHI is honest, calm, and context-aware. They will not forgive confident bad guidance caused by wrong location, stale data, scheduled shows acting like rides, or must-dos being ignored without explanation.

The cleanup priority is:

1. Location trust
2. Recommendation correctness
3. Must-do handling
4. Show and pre-open logic
5. Timer and data freshness
6. Plan usefulness
7. Content depth
8. Weather reliability
9. Day recap and longer-term premium features

---

# 1. GPS / current-area detection major overhaul

## Field-test evidence

This was the biggest trust issue from testing.

### Hollywood Studios

Observed issues:

- User was physically near or in line for Rise of the Resistance / Galaxy's Edge, but the app thought they were in Toy Story Land.
- While walking away from Galaxy's Edge, the app stayed stuck on Galaxy's Edge.
- About halfway through Toy Story Land, the app switched to Echo Lake, which was wrong.
- The bad area detection likely contributed to TOHI recommending Indiana Jones / Star Tours while the user was near Rise.
- Hollywood Studios land anchors or boundaries may be mixed up, too loose, or too sticky.

Why this matters:

- Galaxy's Edge, Toy Story Land, and Echo Lake are not interchangeable areas.
- Rise of the Resistance is a high-priority anchor attraction.
- If TOHI thinks the family is in the wrong land, the recommendation engine can send them across the park for something that only looks nearby in bad location context.

### Magic Kingdom

Observed issues:

- User was physically in line for Pirates of the Caribbean in Adventureland, but the app thought they were in Frontierland near Big Thunder / Tiana's / Country Bears.
- Adventureland detection seemed to stretch from Aladdin all the way toward the middle of Main Street.
- Main Street did not kick in again until midway through Main Street.

Why this matters:

- Pirates being detected as Frontierland is a real trust problem.
- Adventureland should not overreach deep into Main Street.
- Main Street needs better transition handling because it is a major planning and exit corridor.

### Animal Kingdom

Observed issues:

- At or near the Animal Kingdom entrance, the app could not match the user's location to the park.
- A few minutes into the park, GPS started working.

Why this matters:

- Arrival is one of the highest-value moments for TOHI.
- If TOHI is uncertain at the entrance, it should not pretend to know exactly where the family is.
- Entrance / Oasis / Discovery Island transition needs stronger handling.

## Fix direction

This is not a small one-anchor tweak. It needs a full location detection overhaul.

Current system appears too dependent on ride anchors. Closest attraction is not always the same as the land or area where the family is physically standing.

Needed changes:

- Audit all park land anchors.
- Add non-ride markers:
  - land entrances
  - major pathways
  - restaurants
  - shops
  - restrooms
  - show buildings
  - pavilions
  - courtyards
  - transportation points
  - land borders
  - transition zones
  - queue entrances
  - ride exits
  - landmark points
- Add better confidence scoring.
- Add runner-up handling.
- Reduce land stickiness and overreach.
- If location confidence is weak, soften recommendations or ask for manual confirmation.
- Avoid confident nearby language when location confidence is weak.
- Manual area should override bad GPS.
- In Line status should override or heavily outweigh GPS.

Important hierarchy:

    In Line status > manual area selection > high-confidence GPS > low-confidence GPS

---

# 2. Better location markers beyond ride anchors

## Field-test evidence

User explicitly said the app needs better markers instead of relying on rides as the markers.

Observed pattern:

- Closest ride was not always the correct physical area.
- Transition paths between lands caused wrong detection.
- Some areas appeared to stretch too far.
- Some areas failed to activate soon enough.

## Fix direction

Future logic should answer:

    Where is the family physically standing?

Not just:

    What attraction is closest?

Needed marker types:

- land entrances
- walkways
- bridges
- restaurants
- shops
- restrooms
- pavilions
- courtyards
- icon landmarks
- transportation points
- ride entrances
- ride exits
- queue areas
- transition paths between lands

This should become a location-marker system, not just a ride-anchor system.

---

# 3. Scheduled shows should not behave like rides

## Field-test evidence

Repeated issue across parks.

Observed examples:

- Before Hollywood Studios opened, TOHI recommended Indiana Jones Epic Stunt Spectacular and Frozen Sing-Along as Best Move / Smart Backup because they showed 0-minute waits.
- Awesome Planet at EPCOT beat Living with the Land because Awesome Planet showed 0 minutes.
- Festival of the Lion King was still being recommended at 5:41 PM even though listed showtimes were already done, with the final showtime around 4:00 PM.

## Core rule

    0-minute ride wait can be valuable.
    0-minute show wait does not mean "go now."
    0-minute show wait means "check showtime."

## Fix direction

Scheduled shows should not appear in normal Best Move / Smart Backup / Worth the Walk slots unless timing is valid and there is a real upcoming showtime.

Needed behavior:

- Expired shows should disappear from recommendation slots.
- Shows should not beat rides solely because the feed says 0 minutes.
- Shows can surface as:
  - Plan Ahead reminders
  - showtime notes
  - seated reset options
  - rain / heat / low-energy alternatives
- Show recommendations need showtime awareness.
- If showtime data is unavailable, TOHI should be conservative.

Problem attractions/examples to audit:

- Indiana Jones Epic Stunt Spectacular
- Frozen Sing-Along
- Awesome Planet
- Festival of the Lion King

---

# 4. Pre-open recommendation gating

## Field-test evidence

Before Hollywood Studios was open, TOHI recommended:

- Indiana Jones Epic Stunt Spectacular
- Frozen Sing-Along

This was wrong because:

- The park was not open yet.
- Both are scheduled shows.
- The 0-minute wait feed made them look like available moves.

## Fix direction

Before park open, TOHI should not show normal "Go now" recommendations.

Expected pre-open behavior:

- Early Entry strategy
- rope drop target
- first move after opening
- what to line up for
- where to position
- what to ignore until later

Scheduled shows before opening should not appear as Best Move just because they show 0 minutes.

---

# 5. Must-do proximity preservation

## Field-test evidence

Observed issue:

- Rise of the Resistance was selected as a must-do.
- User was physically near or in line for Rise.
- TOHI recommended Indiana Jones / Star Tours instead.
- This felt especially bad because Rise was a must-do and the user was already close.

## Why this matters

Must-dos are not casual preferences. If the family marks something as a must-do, TOHI should treat it as part of what makes the day feel successful.

The app should not send the family away from a nearby must-do unless there is a clear reason.

## Fix direction

Expected behavior:

- If a must-do is nearby and conditions are reasonable, strongly favor helping the family complete it.
- Do not route away from a nearby must-do for a scheduled show or distant option unless clearly justified.
- If the must-do is a bad right-now choice, explain why.
- Use wording like:
  - watching for a better window
  - saving it for a better window
  - holding for a cooler window
  - keeping it in mind

Do not use:

- protect
- protecting
- protection

---

# 6. Must-do tie-break tuning

## Field-test evidence

Observed issue:

- User was in Hollywood Studios, in Galaxy's Edge / in line for Millennium Falcon: Smugglers Run.
- Toy Story Mania and Slinky Dog Dash both showed about 40 minutes.
- Walking difference was not meaningful.
- Slinky Dog Dash was selected as a must-do.
- TOHI recommended Toy Story Mania over Slinky.

Important nuance:

- AI later explained the reason: it was about 107°F feels-like heat.
- Slinky is outdoors / full sun.
- Toy Story Mania is indoor / AC.
- That reasoning can be correct.
- The problem is the recommendation card did not explain the tradeoff clearly, so it looked like TOHI ignored the must-do.

## Fix direction

Expected behavior:

- If a must-do and non-must-do have similar waits and similar walking burden, the must-do should generally win.
- If heat or weather makes the must-do a worse right-now move, TOHI can recommend the indoor / safer option.
- The card must explain the tradeoff clearly.

Example logic:

- Slinky is still important.
- Current heat makes Toy Story Mania the better immediate move.
- TOHI is watching for a cooler Slinky window.

---

# 7. Must-do defer explanation copy

## Field-test evidence

The Slinky vs Toy Story Mania situation showed that even when the logic may be right, the card can feel wrong if the tradeoff is hidden.

## Fix direction

When TOHI delays a must-do, the UI needs to explain the reason.

Example desired copy:

    Slinky is still one of your must-dos, but this heat makes Toy Story Mania the better right-now move. TOHI is watching for a cooler Slinky window.

Avoid:

- protect
- protecting
- protection

Use:

- saving for a better window
- watching for a better window
- holding for a cooler window
- keeping in mind
- making room for it

---

# 8. Recommendation stability while walking

## Field-test evidence

Observed issue at Animal Kingdom:

- At Animal Kingdom entrance / arrival, TOHI recommended Avatar Flight of Passage.
- The family started walking toward Pandora / Avatar.
- Within about two minutes, TOHI demoted Avatar to Plan Ahead and recommended something else.
- This made the app feel unstable.

## Why this matters

Once TOHI gives a strong move and the family starts acting on it, the app should not reverse course immediately unless something meaningful changed.

Fast flips make the app feel indecisive, even if the score changed slightly.

## Fix direction

Expected behavior:

- Add short-term recommendation stability after a strong "Go now" recommendation.
- If the family starts moving toward the recommended attraction, keep supporting that move.
- Add grace-window / commitment behavior.
- Consider a "continue toward this" state.

Only reverse quickly if something meaningful changes:

- wait spike
- closure
- weather / rain / heat risk
- family state
- location confidence
- attraction becomes unreasonable

---

# 9. In-line elapsed timer refresh bug

## Field-test evidence

Observed issue:

- User was in line for Remy.
- App said: "Started around 1:46 PM · About 0 min in line."
- Phone time was around 2:16 PM.
- Expected elapsed time was about 30 minutes.

Later observation:

- User closed / reopened or refreshed the browser.
- Timer corrected itself and showed the right elapsed time.
- This means the stored start time is likely correct.
- The UI is not recalculating elapsed time while the app stays open.

## Fix direction

Expected fix:

- Add minute-level timer tick / recompute.
- Recalculate elapsed time while app is visible and open.
- Recalculate on browser focus.
- Recalculate on visibility return.
- Do not rely on full browser refresh for correct elapsed line time.

---

# 10. EPCOT Figment vs Nemo proximity tuning

## Field-test evidence

Observed issue:

- Near Remy / France / UK / Canada / World Showcase West, TOHI recommended Nemo as Best Move.
- Nemo was 5 minutes, but it is a huge walk from that side.
- Figment was also 5 minutes or became 5 minutes after correction.
- User felt Figment should get the nod over Nemo from that area.
- As user moved closer toward Figment, the app eventually switched to Figment, which was good.
- The tie-break still needs adjustment.

## Fix direction

Expected rule:

    If Figment and Nemo have similar waits, recommend the closer one.

Specific behavior:

From Remy / France / UK / Canada / World Showcase West:

- Best Move should generally be Figment.
- Nemo can be Smart Backup.

From Spaceship Earth / front-central / The Seas side:

- Nemo can get the nod.
- Figment can be backup.

Copy rule:

- Do not say "you're already nearby" unless the attraction is truly nearby.

---

# 11. EPCOT Awesome Planet vs Living with the Land show-vs-ride tuning

## Field-test evidence

Observed issue:

- Near World Nature / same pavilion area, TOHI recommended Awesome Planet at 0 minutes.
- Living with the Land was 5 minutes and in the same pavilion.
- User felt this was wrong because Awesome Planet is a show / film and Living with the Land is a real ride.

## Fix direction

Expected behavior:

- Living with the Land at 5 minutes should beat Awesome Planet as a normal recommendation.
- Awesome Planet can be a seated AC / reset backup if the family specifically needs a quiet show.
- Do not let a 0-minute show beat an actual nearby low-wait ride.

---

# 12. Hollywood Studios proximity / Galaxy's Edge / Toy Story / Echo Lake tuning

## Field-test evidence

Observed issues:

- Near Rise / Galaxy's Edge, TOHI recommended Indiana Jones and Star Tours.
- Star Tours is on the other side of the park from Rise / Galaxy's Edge.
- Indiana Jones is a scheduled show.
- In Toy Story Land, app switched to Echo Lake incorrectly.
- App may have mixed or loose anchors around Galaxy's Edge / Toy Story / Echo Lake.

## Fix direction

Audit and tune:

- Rise
- Smugglers Run
- Galaxy's Edge
- Toy Story Land
- Slinky
- Toy Story Mania
- Echo Lake
- Star Tours
- Indiana Jones
- transition paths between those areas

Expected behavior:

- Strengthen walking friction from Galaxy's Edge to Echo Lake / Star Tours / Indiana Jones.
- Do not route away from Rise if it is a nearby must-do unless clearly justified.
- Avoid "nearby" language unless location confidence is strong.

---

# 13. Animal Kingdom entrance / arrival GPS handling

## Field-test evidence

Observed issue:

- At or near Animal Kingdom entrance, the app could not match location to the park.
- A few minutes into the park, it detected correctly.

## Fix direction

Expected behavior:

- Add entrance / Oasis / Discovery Island arrival anchors.
- Improve park-entry transition handling.
- Avoid confident proximity recommendations until location is matched.
- If uncertain at park entrance, give broad arrival guidance or ask for manual area confirmation.

---

# 14. Weather provider / rain reliability audit

## Field-test evidence

Current provider:

- OpenWeather

Observed issue:

- It rained twice during testing around Bay Lake / EPCOT.
- TOHI / OpenWeather did not catch either event.
- Another weather app showed light rain / thunder and next-hour rain chance.

## Why this matters

Rain and storm conditions directly affect recommendations.

TOHI should shift into rain / storm mode:

- indoor / covered options
- avoid outdoor queues
- avoid long walks
- suggest shops / AC / food / seated reset
- caution for outdoor ride pauses

## Fix direction

Expected direction:

- Audit OpenWeather usage.
- Check refresh cadence.
- Pull precipitation / rain / storm fields more aggressively.
- Consider secondary source / nowcast / radar.
- Evaluate possible sources:
  - Tomorrow.io
  - Apple WeatherKit
  - NWS alerts
  - OpenWeather One Call minute precipitation if available
- Add user override:
  - "It's raining here"
  - "Rain stopped"

---

# 15. Wait freshness and user correction handling

## Field-test evidence

Observed issue:

- TOHI picked Nemo partly because context said Figment was 20 minutes while Nemo was 5.
- User corrected that Figment was actually 5 minutes.
- AI immediately adjusted and recommended Figment.

## Fix direction

Expected behavior:

- Track / show wait freshness more clearly.
- If user corrects a wait, treat it as live context.
- Weigh user corrections heavily in AI chat and possibly recommendation decisions.
- Stale feed data should not overpower current user observation.

---

# 16. Soarin' Across America missing from Waits

## Field-test evidence

Observed issue:

- Soarin' Across America was not in the Waits list.
- Because it was missing from Waits, it could not be recommended.

Impact:

- No wait card.
- No recommendation candidate.
- No Best Move / Backup / Plan Ahead.
- No in-line games tied to it.
- World Nature strategy is incomplete.

## Fix direction

Expected fix:

- Check Queue-Times / feed name.
- Check ride metadata key.
- Check EPCOT inventory mapping.
- Check recommendation eligibility.
- Make sure current naming maps correctly.

---

# 17. Figment While You Wait content missing

## Field-test evidence

Observed issue:

- User was in line for Journey Into Imagination With Figment.
- Figment did not populate any While You Wait questions / games.

## Fix direction

Expected fix:

- Verify Figment ride key mapping.
- Add or verify Figment content for:
  - Quick Trivia
  - Queue Clues
  - Would You Rather
  - Family Vote

---

# 18. Hidden Mickey / Look Around content audit

## Field-test evidence

Observed issue:

- In Mickey & Minnie's Runaway Railway, TOHI showed: "Before you board the train, look up at the wooden ceiling beams. Knots and wood grain can form a Hidden Mickey."
- User said this was almost identical to a Remy prompt that did not exist.
- User does not believe this Runaway Railway Hidden Mickey is true.
- It sounds generic / filler.

## Fix direction

Expected fix:

- Remove generic / unverified Hidden Mickey prompts.
- Avoid "knots / wood grain can form a Hidden Mickey" filler.
- Keep Look Around content attraction-specific.
- Better to have fewer true prompts than many questionable prompts.

---

# 19. Expand winning While You Wait games

## Field-test evidence

Testing result:

- The games were a hit.

Family favorites:

- Quick Trivia
- Queue Clues
- Would You Rather
- Family Vote

Problem:

- Content ran out in about 10 minutes.

## Fix direction

Expected direction:

- Heavily expand the four winning formats.
- Hide or de-emphasize weaker mini-game types.
- Add deeper ride-specific content.
- Add anti-repeat logic.
- Consider AI-generated bonus rounds only after curated content runs low.
- Use guardrails for any AI-generated games so they stay family-friendly, accurate, and not repetitive.

---

# 20. Plan tab simplification

## Field-test evidence

Observed issue:

- Plan section feels too bloated and not useful enough.
- Cards repeat similar strategy.
- It feels more like broad notes than actionable help.
- It does not feel enough like "do this, then this."

## Fix direction

Expected future Plan structure:

- Morning target
- Must-do watchlist
- Midday reset
- Weather / heat fallback
- Evening finish

Each card should answer:

- What should we do?
- When should we do it?
- Why does it matter for this family?

Direction:

- Do not keep adding more generic strategy cards.
- Make Plan smaller, sharper, and state-aware.
- Plan should use profile data and live day context, not repeat broad planning advice.

---

# 21. Move "Your priorities" to Profile / onboarding

## Field-test evidence

Observed issue:

- "Your priorities" / "What matters most" feels like an onboarding / profile question, not something that belongs in Plan.
- Plan should use priorities, not manage them.

## Fix direction

Expected fix:

- Move priorities out of Plan.
- Put them in Profile / onboarding.
- Plan should read those priorities and turn them into actionable guidance.

---

# 22. Plan state-awareness and day recap / cross-park summary

## Plan state-awareness field-test evidence

Observed issue:

- User had already completed Mickey & Minnie's Runaway Railway and Rise of the Resistance.
- Today's Plan at a Glance still referenced completed attractions in a redundant way.
- Plan should know what is already done.

Expected Plan fix:

- Read completed rides.
- Completed must-dos should stop showing as unfinished anchors.
- Shift toward remaining goals.
- Adapt to heat, energy, weather, remaining must-dos, and evening priorities.
- Briefly acknowledge big completed wins if useful, then move on.

## Day recap / cross-park summary field-test evidence

Observed issue:

- AI could count completed rides it saw in the current context, such as 7 Magic Kingdom rides.
- It missed other parks / partial context.
- It could not calculate average wait because the app does not store enough completed-ride wait history.

Expected future summary:

- Track completed rides across all parks for the day.
- Store park and ride.
- Store posted wait when In Line was tapped.
- Store line start time.
- Store completion time.
- Estimate actual line duration.
- Calculate average posted wait.
- Calculate estimated total line time.
- Track must-dos completed vs pending.
- Feed full same-day summary into AI chat.

Future answer example:

    You completed 11 attractions today across Magic Kingdom and Animal Kingdom, with an average posted wait of 24 minutes. You finished 4 of your 5 must-dos.

---

# Additional AI issue: nighttime park comparison

## Field-test evidence

Observed issue:

- User asked during a hotel break whether to return to Hollywood Studios or Magic Kingdom for nighttime shows / fireworks.
- TOHI answered only one path: return to Hollywood Studios around 6:30-7 PM for Fantasmic.
- It did not compare Magic Kingdom fireworks vs Fantasmic.
- It did not weigh travel time, energy, completed attractions, remaining goals, weather, or crowd exit.

## Fix direction

Expected behavior:

- If user names multiple nighttime destinations, TOHI should compare them briefly.
- Compare Fantasmic vs Magic Kingdom fireworks.
- Consider travel time.
- Consider weather.
- Consider family energy.
- Consider completed attractions.
- Consider remaining goals.
- Consider crowd exit.
- Then make one clear recommendation.
- Ask one clarifying question only if the better choice depends on what the family values most.

---

# Positive behavior to preserve

## Resort-break / pacing conversation

AI chat did well in one resort-break / pacing conversation.

Good behavior:

- It remembered the family had completed six rides that morning.
- It called it a productive morning.
- It recommended lunch and water before heat worsened.
- It supported a resort break.
- It gave flexible guidance about a possible Animal Kingdom hop without forcing it.

Preserve this behavior.

---

# Recommended commit roadmap

This roadmap can be implemented as 22 separate commits or grouped into cleaner phases. The item count is 22 total post-test findings / fixes.

## 1. docs: add post-test fieldwork roadmap

Create this document so nothing gets lost.

## 2. fix: improve current-area detection anchors

Start GPS overhaul with better markers beyond ride anchors.

## 3. fix: prioritize in-line and manual area over GPS

Add trust hierarchy:

    In Line status > manual area selection > high-confidence GPS > low-confidence GPS

## 4. fix: tune Hollywood Studios location detection

Covers Galaxy's Edge, Rise, Smugglers Run, Toy Story Land, Slinky, Toy Story Mania, Echo Lake, Star Tours, Indiana Jones, and transition paths.

## 5. fix: tune Magic Kingdom and Animal Kingdom location detection

Covers Magic Kingdom Adventureland / Frontierland / Main Street transitions and Animal Kingdom entrance / Oasis / Discovery Island arrival handling.

## 6. fix: refresh in-line elapsed timer live

Recompute elapsed line time while the app is open and on visibility / focus return.

## 7. fix: clean scheduled show recommendations

Stop expired shows and 0-minute shows from behaving like ride recommendations.

## 8. fix: gate pre-open recommendations

Replace pre-open Go Now cards with rope drop / Early Entry / first-target guidance.

## 9. fix: repair EPCOT inventory and content gaps

Fix Soarin' Across America in Waits and Figment While You Wait content / mapping.

## 10. fix: tune EPCOT proximity and show-vs-ride scoring

Fix Figment vs Nemo and Awesome Planet vs Living with the Land behavior.

## 11. fix: tune Hollywood Studios must-do recommendations

Fix Rise preservation and Slinky vs Toy Story Mania tie-break behavior.

## 12. copy: explain must-do defer reasons

Add clear explanation copy when TOHI delays a must-do for heat, weather, or timing.

## 13. fix: stabilize recommendations while walking

Add short recommendation commitment / grace-window behavior.

## 14. ux: simplify Plan tab

Make Plan smaller, sharper, and more action-oriented.

## 15. ux: move priorities into Profile

Move "Your priorities" / "What matters most" into Profile / onboarding.

## 16. fix: make Plan state-aware

Make Plan react to completed rides, completed must-dos, remaining goals, heat, weather, and evening priorities.

## 17. ai: improve nighttime park comparison

Compare multiple nighttime options when the user asks about them.

## 18. content: audit Look Around hidden Mickey prompts

Remove generic / unverified Hidden Mickey filler.

## 19. content: expand winning While You Wait games

Expand Quick Trivia, Queue Clues, Would You Rather, and Family Vote.

## 20. weather: audit rain and heat reliability

Improve rain / storm / heat detection and consider weather source changes or user override.

## 21. feature: add day recap activity summary

Track cross-park completed attractions, posted waits, line times, actual line duration estimates, and must-do completion.

## 22. feature: add TOHI Pick agreement MVP

Build the profile-gated future feature where the deterministic engine and AI agree before showing a confident TOHI Pick.

---

# Recommended build order

1. Roadmap doc
2. GPS / location overhaul
3. In-line timer
4. Scheduled shows / pre-open handling
5. Inventory and content bugs: Soarin' + Figment
6. EPCOT recommendation tuning
7. Hollywood Studios recommendation tuning
8. Plan tab cleanup
9. While You Wait expansion
10. Weather reliability
11. Day recap
12. TOHI Pick MVP
