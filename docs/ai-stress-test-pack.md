# TOHI AI Stress-Test Pack (47A)

Purpose: a controlled, repeatable checklist for verifying TOHI chat behavior
in real park conditions before the field test. Run manually. Each scenario is
one or two live AI calls — the full pack is roughly 25–30 calls total.

**Do not automate this into a bulk script.** Run it by hand, in the app, while
watching the backend log.

---

## Before running the pack

Confirm these 47A items are in place first (the pack assumes them):

- [ ] `backend/routes/ai.js` delegates to `services/aiService.js` (thin route).
      Until this swap is done, the older inline route prompt is what answers,
      and several scenarios below will rate WEAK instead of PASS.
- [ ] aiAccess fix in `frontend/src/utils/timeContext.js` (missing
      `dayOfHelp`/`dayBeforeHelp` treated as allowed). Until then, every
      in-trip chat request includes "allowed: no · Day-of help is disabled by
      preference" in the AI context.
- [ ] Fresh-at-send chat context in `App.jsx` `handleChatSubmit`
      (`timeContext` and `elapsedMinutesInLine` computed at submit time).
      Until then, scenario 9 will show "elapsed: 0 min" regardless of reality.
- [ ] `dataFreshness` included in chat sessionData + context line in
      `aiService.js`. Until then, scenario 14 cannot pass.
- [ ] Model is pinned to `claude-sonnet-4-5-20250929` (47A rule: no model
      change). Verify the backend starts without a model-not-found error.

## How to watch what the AI actually received

The backend logs one structured `"AI chat request"` entry per call
(pino). For each scenario, check the relevant fields:

- `activePark`, `planningPark`, `planningParkSource`
- `scheduledPrimaryPark`, `scheduledSecondPark`, `hopperStatus`
- `liveParkStatus`, `liveParkMismatch`
- `currentLand`, `locationType`, `locationConfidence`, `nearestAnchorName`
- `currentActivityType`, `currentActivityRide`, `elapsedMinutesInLine`
- `weatherMode`, `timeDayPhase`, `timePlanningMode`, `tripStatus`
- `latestFamilyStateEnergy`, `latestFamilyStateIntent`, `latestFamilyStateNeeds`
- `mustDoCount`, `dayGamePlanCount`, `answerMode`, `model`

In the browser, the Network tab shows the full `sessionData` payload on
`POST /api/ai-chat` — useful when a reply looks wrong and you need to know
whether the context or the model is at fault.

## Free dry checks (no API cost)

- Open-ended intercept: send "What should we do next?" and confirm **no**
  network call to `/api/ai-chat` happens — the warm question is frontend-only.
- Off-topic guard: send "write me a python script" — the redirect reply is
  deterministic (no Claude call; check the log for `off_topic_guardrail`).
- Local fallback: stop the backend, send any message, confirm the honest
  "TOHI Offline Help" reply naming the current cards.

---

## Scenario matrix

Format per scenario: **Setup** → **Send** → **Expect** → **Fail looks like**.

Baseline setup unless stated otherwise: profile complete, trip dates spanning
today, park-day schedule includes today (Magic Kingdom), activePark = Magic
Kingdom, a land selected, live waits loaded (green freshness badge), chat
history cleared (reload the app between scenarios that depend on history).

### 1. Open-ended next move
- Send: "What should we do next?"
- Expect: ONE warm family-state question (e.g., "How's everyone's energy right
  now — still going, or starting to fade?"). No API call. No recommendation yet.
- Fail: a hard recommendation with family state unknown; two stacked questions;
  an API call fired.

### 2. Follow-up family state
- Setup: immediately after scenario 1.
- Send: "We're tired."
- Expect: calm, low-friction reset suggestion. No repeat of the energy
  question. Log shows `latestFamilyStateEnergy: "tired"`, source
  `live_state_answer`.
- Fail: asks how everyone is feeling again; suggests a long-wait headliner.

### 3. Hot and tired
- Send: "We're hot and tired and the kids are getting cranky."
- Expect: AC/shade/water/seated rest first, with a **named place** in the
  current park (not "find some AC"). Log: needs include `ac_or_shade`, `rest`.
- Fail: generic advice with no named location; a ride push.

### 4. Hungry
- Send: "We need food."
- Expect: a specific nearby food option before any ride talk.
- Fail: "grab a snack" with no place; ride recommendation first.

### 5. Need AC
- Send: "We need AC."
- Expect: a specific indoor/AC attraction or location nearby (e.g., Carousel
  of Progress / PeopleMover area from Tomorrowland).
- Fail: "look for air conditioning" with no name.

### 6. Ready for one more
- Send: "We're good for one more ride."
- Expect: one clear ride call using active park, current land, live waits,
  and the recommendation cards. One reason. At most one next step.
- Fail: a list of options; a question instead of a call.

### 7. Meltdown
- Send: "My kid is melting down."
- Expect: optimization stops; calm reset — quiet/seated/low-stimulation,
  food/water if relevant; leaving the park acknowledged as okay if needed.
- Fail: the cheerful energy check-in question; a ride recommendation.
- Variant: "Help, my kid is melting down." Expect the same calm reset.
  (Until the help-intercept fix lands in App.jsx, this variant wrongly
  triggers the energy question — known open item.)

### 8. In line — should we leave?
- Setup: tap **In Line** on Haunted Mansion first.
- Send: "We are in line for Haunted Mansion. Should we leave?"
- Expect: respects the line. No hard "leave" unless clear cause. May ask one
  useful follow-up (is the line moving / how's everyone holding up) or give a
  stay-vs-bail threshold.
- Fail: tells them to leave for optimization reasons.

### 9. Line not moving
- Setup: still In Line from scenario 8; wait several real minutes before
  sending.
- Send: "We have been in line 25 minutes and it has not moved."
- Expect: one useful follow-up or a clear stay/bail threshold. Log:
  `elapsedMinutesInLine` should be the real elapsed number, not 0.
- Fail: blind "stay"; context shows elapsed 0 while the guest says 25
  (stale-context bug — open until the fresh-at-send fix lands).

### 10. Wrong park / schedule mismatch
- Setup: schedule says EPCOT today; activePark = Magic Kingdom.
- Send: "Why is TOHI showing Magic Kingdom when my schedule said EPCOT?"
- Expect: calm explanation of live park vs planning park vs schedule; no
  field names; no "fallback" jargon; not treated as an error.
- Fail: internal terms (`parkDayScheduleStatus`, "profile fallback") in the
  reply; defensive tone.

### 11. Missing schedule
- Setup: park-day schedule does not include today.
- Send: "Why does my plan say Magic Kingdom today?"
- Expect: a real explanation (schedule doesn't cover today, so TOHI uses the
  profile park). Watch for the reply being clipped to something useless —
  "why does" runs in live mode until mode-detection parity lands.
- Fail: answer dodges the question, or the first sentence is missing.

### 12. Park hopper
- Setup: schedule today = EPCOT primary + Magic Kingdom secondary; afternoon.
- Send: "Should we hop to Magic Kingdom now?"
- Expect: uses the hopper time window, second-park must-dos, family state,
  weather. Does not force the hop; "only if it's worth it" framing is good.
- Fail: unconditional "yes, go now" with no energy/time reasoning.

### 13. Second park with must-dos
- Setup: as 12, but activePark switched to Magic Kingdom (the second park);
  MK must-dos saved.
- Send: "We are at Magic Kingdom now after EPCOT. What matters most?"
- Expect: treats MK as the active second park; references the saved must-dos
  as context, not pressure.
- Fail: acts confused about why they're at MK; ignores must-dos.

### 14. Stale data
- Setup: force stale waits (stop the upstream source or wait for `stale`
  badge), then ask about a far ride.
- Send: "Should we cross the park for this?"
- Expect: brief caution that data may be out of date + suggest refresh/official
  app check before the long walk. Requires the `dataFreshness` handoff.
- Fail: confident cross-park call on stale numbers with no caveat.

### 15. Storm mode
- Setup: storm mode active (real or simulated weather payload).
- Send: "Should we ride Big Thunder now?"
- Expect: no outdoor coaster during active storm/lightning; indoor pivot
  with a named option.
- Fail: recommends the outdoor ride; vague "be careful."

### 16. Height restriction
- Setup: profile with a 36" shortest rider.
- Send: "Should we do Space Mountain?"
- Expect: not presented as a whole-family option (44" minimum); Rider Switch
  or split-party only as optional adult strategy; if multiple blocked rides
  come up, all are flagged, not just one.
- Fail: whole-family recommendation for a ride the child can't ride.

### 17. Resort break
- Setup: resort set in profile (try one MK-direct, e.g., Wilderness Lodge,
  and one Skyliner resort, e.g., Pop Century, on separate runs from MK).
- Send: "Should we go back to the resort?"
- Expect: uses direct access and break strategy. From MK: Wilderness Lodge
  framed as realistic; Pop Century NOT framed as a quick hop.
- Fail: treats any resort as a quick break regardless of transport reality.

### 18. Vague stress
- Send: "This day is going off the rails."
- Expect: emotionally calm, simple recovery path (one small next step), not a
  ride-optimization answer. Note: this phrasing matches no family-state
  pattern, so the model gets raw text only — tone is the test.
- Fail: peppy optimization; ignoring the stress.

### 19. Calmest move
- Send: "What is the calmest move from here?"
- Expect: low-walking, AC/shade/seated, current-land-aware, named option.
  Log: needs include `calm`.
- Fail: a headliner with a long queue.

### 20. Big ride while tired
- Send: "We're tired but want one more big ride."
- Expect: tradeoff-aware: acknowledges tiredness, picks the most realistic
  big ride (shortest wait / closest), or suggests a short reset first —
  without shutting the request down entirely.
- Fail: ignores tiredness completely, OR refuses the ride entirely.

### 21. Characters
- Send: "The kids want characters."
- Expect: uses family priorities and nearby options; cautious about times;
  points to the official app for character schedules; invents nothing.
- Fail: specific made-up character times/locations.

### 22. Food vs must-do conflict
- Setup: Haunted Mansion saved as a must-do.
- Send: "We are hungry but Haunted Mansion is a must-do."
- Expect: food/reset first while hunger is active, then Haunted Mansion —
  must-do honored, not dismissed, not forced first.
- Fail: "do the must-do first" while ignoring hunger; or must-do dismissed.

### 23. Why
- Setup: right after any recommendation reply.
- Send: "Why are you recommending that?"
- Expect: brief explanation from family state, location, wait value, weather,
  or must-do context — no internal field names, no "the system scored it."
- Fail: banned language ("algorithm", "score", "optimized"); clipped
  non-answer (watch: "why are" runs in live mode until parity lands).

### 24. User says no
- Setup: right after any recommendation reply.
- Send: "No, we don't want that."
- Expect: adapts calmly; one reasonable alternative; no defensiveness, no
  repeating the rejected option.
- Fail: re-recommends the same thing; argues.

### 25. AI offline fallback
- Setup: stop the backend (or disconnect).
- Send: anything.
- Expect: "TOHI Offline Help" — honest about not understanding the question,
  names the current Best Move/Smart Backup cards, resort break guidance,
  weather mode note, suggests retrying.
- Fail: a fake "understood" answer; an unstyled error.

---

## Cross-cutting pass criteria (apply to every scenario)

- One recommendation, not a menu, for live questions.
- Leads with the action, not context ("Based on…", "I see…", "You're in…").
- Never exposes internal field names or schedule/fallback mechanics unprompted.
- Never invents wait times, showtimes, hours, or Lightning Lane status.
- Never uses banned words: optimize, algorithm, system, scoring, ranked,
  warning/alert (non-safety), "best available option" without a reason.
- Never sounds like it was told help is disabled (watch this until the
  aiAccess fix lands).
- Calm voice throughout: a steady friend, not a dashboard.

## Recording results

Copy this row per scenario into a results file or sheet:

```
| # | date/time | setup ok | reply (short) | pass/weak/fail | notes |
```

Re-run only failed scenarios after a fix — no need to re-run the full pack
each time. Keep total live calls per session under ~30.
