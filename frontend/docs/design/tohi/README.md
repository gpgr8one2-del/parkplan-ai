# Approved TOHI chat blueprints

These four exports are the **implementation source of truth** for the TOHI chat
tab redesign. When an implementation decision and one of these images disagree,
the image wins — or the change stops and gets re-approved. Nothing here may be
recreated, reinterpreted, cropped, resized, or recompressed.

| File | Shows | Mode | Size |
|---|---|---|---|
| `tohi-approved-healthy-day.png` | Healthy TOHI chat, active conversation | Day | 1010 × 1124 |
| `tohi-approved-healthy-night.png` | Healthy TOHI chat, active conversation | Night | 1010 × 1124 |
| `tohi-approved-states-day.png` | Secondary-state reference sheet, ten states | Day | 1010 × 5486 |
| `tohi-approved-states-night.png` | Secondary-state reference sheet, ten states | Night | 1010 × 5486 |

The healthy sheets remain 1010 × 1124. The state sheets are now 1010 × 5486,
which is 51px taller than the original approval: the branded header plate below
is taller than the text badge it replaced, and the state sheets stack ten frames.

The two healthy sheets are a single simulated phone screen each. The two state
sheets are specification sheets covering the ten secondary states:

1. Empty chat with the three existing suggested prompts
2. Suggested prompt selected but not submitted
3. Sending, with the user message retained
4. Connection failure with the conversation retained above it
5. Clarification question carrying `QUICK CHECK`
6. Locked / trip-setup-required
7. Long user question and long multi-paragraph reply
8. Keyboard-open composition
9. Blank input with Send disabled
10. Malformed or missing response, resolved as the connection-failure state

Approved artifact:
`https://claude.ai/code/artifact/afef2396-622f-4f3d-b985-a610d67280c3`

The committed PNGs in this directory are authoritative. The artifact link
records where the sheets were reviewed and approved; it is not a substitute for
the files, and production must never fetch it.

## Scope: the TOHI tab is chat only

The TOHI **tab** contains one feature: TOHI chat. The TOHI **name** is attached
to several unrelated things that live in other tabs and stay there. This
redesign does not move any product feature between tabs.

| Feature | Renders in | In scope here |
|---|---|---|
| TOHI chat | TOHI tab | **Yes** |
| TOHI Pick | Plan tab, via `PlanRecommendations` | No |
| TOHI Pick clarification | Plan tab | No |
| Recommendation cards | Plan tab, via `RecommendationCard` | No |
| Plan guidance | Plan tab | No |
| While You Wait | Home tab, via `WhileYouWaitCard` | No |

## Day and night

- **Day and night preserve identical structure, hierarchy, measurements, copy,
  and behavior. Only presentation tokens change.** Both modes render from one
  markup source for this reason, and the exported sheets are the same pixel
  height in each mode as a result.
- Night uses **deep navy surfaces, not pure black**, and no bright white cards.
- Night reuses the palette already approved for Waits, so TOHI reads as the same
  application rather than a separate product.

## Branded header

The approved header carries the **official committed wordmark**,
`frontend/public/tohi-logo.png` (874 × 286, RGBA), as the branded element
directly above the `Ask TOHI` heading.

| Property | Value |
|---|---|
| Source logo | `frontend/public/tohi-logo.png`, 874 × 286 RGBA |
| Displayed logo | 80 × ~26.17px, intrinsic aspect ratio preserved |
| Brand plate | ~106 × 42.17px, identical geometry in both modes |
| Day plate | `#F3E8FF` |
| Night plate | `#E9E3FB` |

- **The official logo must never be redrawn, recoloured, traced, distorted,
  cropped, or replaced.** It is used exactly as committed and only displayed at
  a smaller size.
- **The pale night plate is intentional.** The wordmark ink measures `#7742D2`
  and may not be recoloured. Directly against the navy shell that is roughly
  2.8–3.0:1, which is not readable. The pale lavender plate carries it at about
  4.8:1 while staying clearly not white, so it does not glare on the dark shell.
  Day reaches about 5.1:1 on the same geometry.
- **The `TOHI COMPANION` text badge is no longer part of the approved design.**
  The wordmark replaces it in the same position.
- **No generic MessageCircle or chat icon appears in the redesigned header.**
  The wordmark stands alone; nothing sits beside it.
- **The full wordmark is not used in BottomTabs.** Navigation keeps its existing
  compact TOHI sparkle icon.
- **Production accessibility requirement: the header logo uses `alt=""`.** The
  adjacent `Ask TOHI` heading already identifies the feature, so alt text on the
  logo would be a duplicate announcement. The mark is decorative in this
  position and is not the accessible name of anything.

## Locked visual direction

The current TOHI tab carries several treatments that must **not** carry forward:

- **No decorative corner circles.** The two absolutely-positioned circles in the
  current implementation are removed.
- **No fake overflow, menu, settings, bell, chevron, search, filter, or dropdown
  control.** The simulated status area shows ordinary non-interactive signal,
  Wi-Fi, and battery indicators only. TOHI does not ship controls with no
  behavior behind them.
- **No persistent decorative scrollbar.** The transcript scrolls natively. The
  only additional-content affordance is a quiet non-interactive edge fade.
- **No emoji in the header.** The current `✨` is removed. The header carries the
  official wordmark described above, not an emoji and not a text badge.
- **No loud gradients.** No radial card glow, no bright multi-stop gradient as
  the visual identity, and no full purple gradient user bubbles.
- **No translucent white layers**, which cannot translate to night.
- One consistent radius system rather than mixed values.

## Locked interaction decisions

- **A connection failure is never rendered as an ordinary TOHI answer.** It uses
  a distinct inline connection-status surface inside the transcript, visually
  separate from assistant messages.
- **The existing conversation remains visible after a failure.**
- **No Retry button is added.** The existing composer Send is the retry.
- Approved failure copy:

  `TOHI couldn’t connect right now. Your plan and recommendations haven’t changed. You can try sending your question again.`

- **Clarification intercepts remain assistant messages** but carry a subtle
  `QUICK CHECK` label, so a question back is not visually identical to an answer.
- **Send is disabled whenever the message is empty or a request is already in
  flight.** Blank or whitespace-only input shows Send disabled; no warning copy
  is needed.
- **A malformed or missing response uses the same connection-failure state.**
  An empty message bubble is never displayed.
- **Paragraph breaks in responses remain visible.** Replies render as separate
  paragraphs rather than a single collapsed run of text.
- **Sending shows a visible inline loading state** with the approved copy:

  `TOHI is checking your park-day context…`

- **The composer carries a visible `Your question` label**, not a
  visually-hidden one, and a visible keyboard focus treatment.
- **Bottom-navigation suppression is restricted to the TOHI composer while its
  mobile keyboard is open.** It exists so the navigation cannot cover the
  composer during composition. **It must not change keyboard or navigation
  behavior on Profile, onboarding, or any other tab.** Any implementation must
  scope this to the TOHI composer and prove that scoping.

## Not approved

- **No chat persistence across reload is approved.** The transcript stays
  in-memory for the session, exactly as it behaves today.
- **No Start Over, copy, retry, timestamp, reaction, or message-editing control
  is approved.**

## Outside this visual phase

The following were found during the 64A-1 audit and are deliberately **not**
addressed by these blueprints. They remain unchanged:

- the unused `canUseAiChat` time gate, which is currently computed for telemetry
  and never enforced
- backend `/api/ai-chat` response behavior, including the 500-path reply the
  frontend currently discards
- chat persistence

## The logo correction does not authorize production code

Replacing the wordmark in these sheets is a **documentation correction only**. It
does not change the running application and does not authorize a production-code
change on its own. The header still ships the existing text badge until a later
approved phase implements the redesign.

Every previously locked decision stands unchanged — behavioural, extraction,
state, keyboard, and sequencing. In particular the extraction rule at the bottom
of this file is untouched: 64B-1 was byte-identical to production, the inline
`TOHI:` and `You:` prefixes survive extraction, and moving message identity into
separate speaker labels still belongs to the later day-redesign phase.

## These blueprints are a visual target, not authorization

The sheets show the approved **presentation**. They are not authorization to
change AI behavior, recommendation logic, access control, scoring, or Plan
behavior. Those follow the rules in `CLAUDE.md` and change only when Gabe
explicitly asks.

The reference-sheet labels, state numbers, and implementation notes visible
around each simulated screen are **documentation. They must never become app
UI.** On the sheets they sit deliberately outside every simulated screen area,
on a neutral ground that is not the app background.

## Extraction rule

The extraction phase and the redesign phase are separate, and must stay separate.

- **Phase 64B-1 must be byte-identical to current production.** It is a
  presentation-only move of the existing TOHI branch into its own component,
  proven by a render-parity harness, with no visual change at all.
- **The current inline `TOHI:` and `You:` message prefixes remain during
  extraction.** They ship today as `<strong>` prefixes inside each bubble and
  must survive 64B-1 unchanged.
- **Moving message identity into separate `YOU` and `TOHI` speaker labels above
  each message belongs to the later day-redesign phase**, not to extraction.
  That change is visible, so it cannot ride along inside a byte-identical move.
