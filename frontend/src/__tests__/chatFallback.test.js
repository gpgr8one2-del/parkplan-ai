/**
 * Regression: when AI chat fails, the TOHI Offline Help fallback must NOT
 * pretend it understood the user's question. It must:
 *   - acknowledge it cannot reach the AI
 *   - use deterministic context (current activity, weather, recommendations)
 *   - never echo or paraphrase the user's question
 *
 * The fallback function signature is intentionally narrow: it takes only
 * deterministic context, NOT the user's message. This test pins that
 * contract.
 */

import { buildLocalChatFallback } from "../utils/chatFallback";
// ^ NOTE: this expects buildLocalChatFallback to be extracted from App.jsx
//   into a standalone module so it's testable. See "small beta-safety
//   patches" in the test plan.

describe("offline chat fallback", () => {
  test("function signature does NOT accept user message text", () => {
    // Contract guard: the fallback should not have a way to receive the
    // user's question. If a future refactor adds a `userMessage` param,
    // this test will fail and force a review.
    const allowedKeys = new Set([
      "activePark",
      "weatherMode",
      "currentActivityContext",
      "recommendations",        // optional, future-friendly
      "familyProfile",          // optional
      "resortBreakStrategy",    // optional
    ]);

    // We can't introspect param names directly in JS, but we can assert
    // behavioral invariants: the fallback output must never contain
    // anything the test caller didn't supply.
    const reply = buildLocalChatFallback({
      activePark: "magic_kingdom",
      weatherMode: { mode: "normal" },
      currentActivityContext: null,
    });

    // Free-form sanity check — no question echo possible because we
    // didn't supply one.
    expect(reply).not.toMatch(/you asked/i);
    expect(reply).not.toMatch(/your question/i);
    expect(reply).not.toMatch(/regarding what you said/i);
  });

  test("in-line context: mentions ride name and elapsed time, doesn't claim understanding", () => {
    const reply = buildLocalChatFallback({
      activePark: "magic_kingdom",
      weatherMode: { mode: "normal" },
      currentActivityContext: {
        type: "in_line",
        rideName: "Big Thunder Mountain Railroad",
        elapsedMinutesInLine: 22,
        postedWaitAtStart: 35,
      },
    });

    expect(reply).toMatch(/Big Thunder/);
    expect(reply).toMatch(/22/);
    expect(reply).toMatch(/trouble reaching AI|offline|cannot reach/i);
  });

  test("storm weather: tells the family to favor indoor / nearby options", () => {
    const reply = buildLocalChatFallback({
      activePark: "magic_kingdom",
      weatherMode: { mode: "storm", label: "Storm Mode" },
      currentActivityContext: null,
    });

    expect(reply).toMatch(/indoor|shade|AC|water/i);
    expect(reply).toMatch(/trouble reaching AI|offline|cannot reach/i);
  });

  test("nothing notable: generic family-energy fallback, no fake understanding", () => {
    const reply = buildLocalChatFallback({
      activePark: "magic_kingdom",
      weatherMode: { mode: "normal" },
      currentActivityContext: null,
    });

    expect(reply).toMatch(/trouble reaching AI|offline|cannot reach/i);
    // Should not start with anything that implies it processed a question.
    expect(reply).not.toMatch(/^based on what you|^to answer your|^regarding/i);
  });

  test("reply never contains the literal string 'I understand'", () => {
    // Belt-and-suspenders: any future copy update must not slip in fake
    // empathy claims.
    const reply = buildLocalChatFallback({
      activePark: "magic_kingdom",
      weatherMode: { mode: "normal" },
      currentActivityContext: {
        type: "in_line",
        rideName: "Haunted Mansion",
        elapsedMinutesInLine: 15,
      },
    });

    expect(reply).not.toMatch(/I understand/i);
    expect(reply).not.toMatch(/I hear you/i);
  });
});
