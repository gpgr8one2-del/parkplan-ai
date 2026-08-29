/**
 * TOHI Voice Phase A3 — spoken reply unit tests.
 *
 * These EXECUTE the real helpers in src/utils/voiceSpeech.js and the real
 * synthesizeSpeechAudio in src/api.js. `fetch` is stubbed: no network, no
 * Anthropic call, no OpenAI call, no API key, and no audio hardware.
 *
 * React closure freshness, playback ordering and cancellation races are NOT
 * claimed here — those are proved by voiceSpeechAppIntegration.test.js, which
 * mounts the real App.
 */

import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

import { TohiTab } from "../components/TohiTab";
import {
  MAX_SPEECH_BYTES,
  MAX_SPEECH_CHARS,
  SPEECH_COPY,
  SPOKEN_DETAIL_NOTE,
  isMpegAudioContentType,
  isSpeechOutputSupported,
  normalizeAudioContentType,
  normalizeSpeechText,
  playbackResultToPromise,
  prepareSpokenReply,
  validateSpeechBlob,
  validateSpeechText,
} from "../utils/voiceSpeech";
import { synthesizeSpeechAudio, trackEvent } from "../api";

const card = { background: "#fff", borderRadius: 20, padding: 16 };
const button = { border: "none", borderRadius: 12, padding: "10px 14px" };

function renderTohi(props = {}) {
  return renderToStaticMarkup(
    React.createElement(TohiTab, {
      chat: [],
      message: "",
      chatLoading: false,
      hasPersonalizedAccess: true,
      setMessage: () => {},
      onChatSubmit: () => {},
      renderLockedFeatureCard: () => null,
      card,
      button,
      ...props,
    })
  );
}

const withVoice = (props = {}) => ({
  voiceSupported: true,
  onVoicePress: () => {},
  speechSupported: true,
  onToggleVoiceReplies: () => {},
  onStopSpeech: () => {},
  onPlaySpeech: () => {},
  ...props,
});

describe("9. speech-only response preparation", () => {
  test("shortens a longer ordinary reply while preserving the actionable opening", () => {
    const visibleReply =
      "Head to Pirates of the Caribbean now — it’s a 10-minute wait. " +
      "It is one of your must-dos. After that, Haunted Mansion is a good backup. " +
      "You can also keep Jungle Cruise flexible for later.";

    expect(prepareSpokenReply(visibleReply)).toBe(
      "Head to Pirates of the Caribbean now, it’s a ten minute wait. " +
        "It is one of your must-dos. " +
        SPOKEN_DETAIL_NOTE
    );
    // Preparation never mutates the authoritative visible string.
    expect(visibleReply).toContain("Haunted Mansion");
  });

  test("reads waits, clock times, percentages and park names naturally", () => {
    // Asserted as two shorter replies: spelling times out in full words pushes
    // a combined fixture past the summary target, which would shorten it and
    // stop these conversions being visible in one exact comparison.
    expect(
      prepareSpokenReply("**BEST MOVE:** EPCOT opens at 9 AM and closes at 9:00 PM.")
    ).toBe("Epcot opens at nine in the morning and closes at nine in the evening.");

    expect(
      prepareSpokenReply("TRON’s wait is 5–10 min. Na’vi River Journey is an option at 49%.")
    ).toBe("Tron’s wait is five to ten minutes. Nah-vee River Journey is an option at forty-nine percent.");
  });

  test("keeps weather and safety guidance complete instead of summarizing it", () => {
    const weatherReply =
      "Rain is moving in around 7:30 PM. Head indoors before the next heavy band. " +
      "If lightning is nearby, stay sheltered. Keep the ponchos with you for the walk out.";
    const spoken = prepareSpokenReply(weatherReply);

    expect(spoken).toContain("Rain is moving in around seven thirty in the evening.");
    expect(spoken).toContain("If lightning is nearby, stay sheltered.");
    expect(spoken).toContain("Keep the ponchos with you for the walk out.");
    expect(spoken).not.toContain(SPOKEN_DETAIL_NOTE);
  });

  test("removes visual-only headings, markdown, links and symbols", () => {
    const spoken = prepareSpokenReply(
      "## ✨ TOHI PICK · BEST MOVE\n- **Pirates of the Caribbean** — 5 min.\n" +
        "- [Open the map](https://example.com/map)"
    );

    expect(spoken).toBe("Pirates of the Caribbean, five minutes. Open the map");
    expect(spoken).not.toMatch(/https?:|[*#✨•]/);
  });

  test("can bring a long ordinary reply under the existing speech ceiling", () => {
    const visibleReply =
      "Start with Spaceship Earth. The wait is 5 min. " +
      "These additional planning details stay visible on screen. ".repeat(14);
    const spoken = prepareSpokenReply(visibleReply);

    expect(visibleReply.length).toBeGreaterThan(MAX_SPEECH_CHARS);
    expect(spoken).toContain("Start with Spaceship Earth.");
    expect(spoken).toContain(SPOKEN_DETAIL_NOTE);
    expect(validateSpeechText(spoken).ok).toBe(true);
  });

  test("ordinary prose keeps label-like phrases and stays grammatical", () => {
    // Regression: a case-insensitive, unanchored label strip deleted these as
    // English phrases and left broken sentences behind.
    expect(prepareSpokenReply("The best move is Big Thunder Mountain right now.")).toBe(
      "The best move is Big Thunder Mountain right now."
    );
    expect(prepareSpokenReply("My recommendations are simple: head left, then rest.")).toBe(
      "My recommendations are simple: head left, then rest."
    );
    expect(prepareSpokenReply("Here is why this works for your family today.")).toBe(
      "Here is why this works for your family today."
    );
    // Not line-initial and not followed by a separator, so it is prose too.
    expect(prepareSpokenReply("Ask me why this works and I will explain.")).toContain(
      "why this works"
    );
  });

  test("visual labels are removed in upper and title case when used as headings", () => {
    expect(prepareSpokenReply("BEST MOVE: Head to Pirates now.")).toBe("Head to Pirates now.");
    expect(prepareSpokenReply("Best Move: Head to Pirates now.")).toBe("Head to Pirates now.");
    expect(prepareSpokenReply("Best Move — Head to Pirates now.")).toBe("Head to Pirates now.");
    expect(prepareSpokenReply("SMART BACKUP: Haunted Mansion is close.")).toBe(
      "Haunted Mansion is close."
    );
    expect(prepareSpokenReply("RECOMMENDATION: Try Jungle Cruise.")).toBe("Try Jungle Cruise.");
    expect(prepareSpokenReply("RECOMMENDATIONS: Try Jungle Cruise.")).toBe("Try Jungle Cruise.");
    // A standalone label line disappears without stranding punctuation.
    expect(prepareSpokenReply("TOHI PICK\nPirates of the Caribbean is closest.")).toBe(
      "Pirates of the Caribbean is closest."
    );
  });

  test("abbreviations never end a sentence", () => {
    const toad =
      "Mr. Toad's Wild Ride is posted at 15 minutes right now, and it sits beside where you " +
      "are standing, so it is comfortably the cheapest win available before the afternoon " +
      "parade shuts the walkway. Head there first, then loop back.";
    const spokenToad = prepareSpokenReply(toad);

    // Regression: this used to collapse to "Mr. I've put the rest..."
    expect(spokenToad.startsWith("Mr. Toad's Wild Ride")).toBe(true);
    expect(spokenToad).not.toBe(`Mr. ${SPOKEN_DETAIL_NOTE}`);

    expect(prepareSpokenReply("Mt. Everest has a long wait. Try something closer.")).toBe(
      "Mt. Everest has a long wait. Try something closer."
    );
    expect(prepareSpokenReply("St. Patrick's is closed today. Head elsewhere.")).toBe(
      "St. Patrick's is closed today. Head elsewhere."
    );
  });

  test("a decimal point never ends a sentence or loses its leading digits", () => {
    const walk =
      "You are 1.5 miles out. Walking that in the middle of the afternoon with a tired eight " +
      "year old costs more than it gives back, so take the boat instead and save everyone's legs.";
    const spokenWalk = prepareSpokenReply(walk);

    // Regression: this used to speak "5 miles out", a different distance.
    expect(spokenWalk).toContain("1.5 miles");
    expect(spokenWalk.startsWith("You are 1.5 miles out.")).toBe(true);
    expect(spokenWalk).not.toMatch(/(^|\s)5 miles/);

    expect(prepareSpokenReply("The parade route is 0.75 miles from here. Give yourself time.")).toBe(
      "The parade route is 0.75 miles from here. Give yourself time."
    );
  });

  test("number expansion can never push prepared speech past the provider ceiling", () => {
    // Under 600 raw, but "25 min" -> "twenty-five minutes" expands it well past
    // the limit. Budgeting before expansion made this silently unspeakable.
    const raw =
      "Here is the run of waits I can see for you at the moment: " +
      Array.from({ length: 22 }, (_, index) => `option ${index} is 25 min`).join(", ") +
      ".";
    expect(raw.length).toBeLessThanOrEqual(MAX_SPEECH_CHARS);

    const spoken = prepareSpokenReply(raw);
    expect(spoken.length).toBeLessThanOrEqual(MAX_SPEECH_CHARS);
    expect(validateSpeechText(spoken).ok).toBe(true);

    // Even a single unsplittable sentence far past the ceiling stays speakable.
    const runOn = `Start here. ${"detail ".repeat(400)}`;
    const boundedRunOn = prepareSpokenReply(runOn);
    expect(boundedRunOn.length).toBeLessThanOrEqual(MAX_SPEECH_CHARS);
    expect(validateSpeechText(boundedRunOn).ok).toBe(true);
  });

  test("real weather and heat guidance from production copy is preserved complete", () => {
    // Every case is deliberately LONG enough (three-plus sentences, well past
    // the 180-character summary target) that it WOULD be shortened without the
    // guard. A short fixture would pass whether the guard worked or not.
    const cases = [
      "This is the window where families usually wait too long to cool down. " +
        "Use water, AC, food, shade, or a seated show before the day gets harder. " +
        "Keep the stroller in the shade while you are parked. " +
        "Check on the youngest first when you sit down.",
      "Pick the nearest indoor show, restaurant, shop, or attraction first. " +
        "Hollywood Studios has fewer options than you think. " +
        "ABC Commissary is a strong indoor reset with seating. " +
        "Head there before the queue builds.",
      "It is going to pour in about an hour, so keep the ponchos handy. " +
        "Stay near covered walkways when you can. " +
        "Do not cross the park for a small wait-time win during the downpour. " +
        "Wait it out somewhere with seating.",
      "Sunscreen up before you head back out into the open queue areas. " +
        "The sun is hardest on the walkways with no cover. " +
        "Keep everyone drinking even if nobody says they are thirsty. " +
        "Reapply after the water rides.",
    ];

    // Guard rail on the fixtures themselves: if these ever became short enough
    // to escape shortening, the assertions below would stop proving anything.
    cases.forEach((reply) => {
      expect(reply.length).toBeGreaterThan(180);
    });

    cases.forEach((reply) => {
      const spoken = prepareSpokenReply(reply);
      expect(spoken).not.toContain(SPOKEN_DETAIL_NOTE);
      // Every sentence of the guidance survives.
      reply.split(". ").forEach((fragment) => {
        expect(spoken).toContain(fragment.replace(/\.$/, "").trim().slice(0, 40));
      });
    });
  });

  test("temperature-only safety guidance keeps every instruction", () => {
    // Regression: the guard ran AFTER "97°F" had become words, so it no longer
    // recognised the only weather signal present and summarized the reply,
    // dropping the instructions that mattered most.
    const reply =
      "It is 97°F right now. Take a break before the next ride. " +
      "Sit for twenty minutes. Do not head back outside until everyone feels better.";
    const spoken = prepareSpokenReply(reply);

    expect(spoken).toContain("ninety-seven degrees Fahrenheit");
    expect(spoken).toContain("Take a break before the next ride.");
    expect(spoken).toContain("Sit for twenty minutes.");
    expect(spoken).toContain("Do not head back outside until everyone feels better.");
    expect(spoken).not.toContain(SPOKEN_DETAIL_NOTE);
  });

  test("a spoken time never ends a sentence early", () => {
    // Regression: "9 AM" became "nine A.M." and the scanner read that trailing
    // period as a sentence end, dropping the meeting place from speech.
    const morning =
      "Meet at 9 AM near Spaceship Earth before walking to the next attraction because it is " +
      "the simplest place for the entire family to regroup without crossing the park again or " +
      "losing the current low-wait opportunity. Haunted Mansion is the backup. Keep the rest visible.";
    const spokenMorning = prepareSpokenReply(morning);
    expect(spokenMorning).toContain("nine in the morning near Spaceship Earth");
    expect(spokenMorning).not.toMatch(/A\.M\./);

    const evening =
      "Return at 8 PM by the park entrance and regroup there before the fireworks push everyone " +
      "toward the exits all at once tonight. Keep the rest visible.";
    expect(prepareSpokenReply(evening)).toContain("eight in the evening by the park entrance");

    // A time that genuinely ends a sentence still splits correctly.
    expect(prepareSpokenReply("Rope drop is at 9 AM. Haunted Mansion is the backup.")).toBe(
      "Rope drop is at nine in the morning. Haunted Mansion is the backup."
    );
  });

  test("ordinary recommendations still shorten when they merely mention indoor or water", () => {
    const pirates =
      "Head to Pirates of the Caribbean now, it is a 10 min wait and fully indoor, which makes " +
      "it the easiest win you have before the afternoon parade closes the walkway and pushes " +
      "everyone toward the hub. Haunted Mansion is the backup. Keep Jungle Cruise flexible.";
    const spokenPirates = prepareSpokenReply(pirates);
    expect(spokenPirates).toContain(SPOKEN_DETAIL_NOTE);
    expect(spokenPirates).not.toContain("Jungle Cruise");
    // A duration in front of a noun is singular in English.
    expect(spokenPirates).toContain("a ten minute wait");
    expect(spokenPirates).not.toContain("a ten minutes wait");

    const tiana =
      "Tiana's Bayou Adventure is posted at 25 min and it is a water ride, so it is a good pick " +
      "while the queue is short and everyone still has energy left for the rest of the " +
      "afternoon. Big Thunder is the backup. Keep the rest on screen.";
    const spokenTiana = prepareSpokenReply(tiana);
    expect(spokenTiana).toContain(SPOKEN_DETAIL_NOTE);
    expect(spokenTiana).not.toContain("Big Thunder");
  });

  test("explicit indoor, water and hydration instructions are still preserved complete", () => {
    const cases = [
      "Head indoors before the storm rolls through and stay put until it clears, then pick the " +
        "next ride once the walkways drain and the crowds start moving again. " +
        "Big Thunder is the backup. Keep the rest visible.",
      "Pick the nearest indoor show or restaurant first, then reassess once the band passes over " +
        "the park and the walkways start to dry out. Big Thunder is the backup. Keep the rest visible.",
      "Use water, AC, food, and shade before the day gets harder on the youngest one in your " +
        "group this afternoon, because the middle of the day is when families push too far. " +
        "Big Thunder is the backup. Keep the rest visible.",
      "Keep sipping water while you walk between the two lands so nobody runs down before the " +
        "evening show starts, because that stretch has very little cover along the way. " +
        "Big Thunder is the backup. Keep the rest visible.",
    ];

    cases.forEach((reply) => {
      expect(reply.length).toBeGreaterThan(180);
      expect(prepareSpokenReply(reply)).not.toContain(SPOKEN_DETAIL_NOTE);
    });
  });

  test("durations are singular before a noun and plural on their own", () => {
    // Attributive: the duration modifies the noun that follows it.
    expect(prepareSpokenReply("It is a 10 min wait.")).toBe("It is a ten minute wait.");
    expect(prepareSpokenReply("It is a 25-minute wait.")).toBe("It is a twenty-five minute wait.");
    expect(prepareSpokenReply("It is a 5 min walk.")).toBe("It is a five minute walk.");
    expect(prepareSpokenReply("It is a 1 min wait.")).toBe("It is a one minute wait.");
    expect(prepareSpokenReply("It is a 5–10 min wait.")).toBe("It is a five to ten minute wait.");

    // Standalone: nothing follows for the duration to modify.
    expect(prepareSpokenReply("The wait is 10 min.")).toBe("The wait is ten minutes.");
    expect(prepareSpokenReply("Wait about 1 min.")).toBe("Wait about one minute.");
    expect(prepareSpokenReply("Expect between 5–10 min.")).toBe(
      "Expect between five to ten minutes."
    );

    // A following word that is not one of the modified nouns stays plural.
    expect(prepareSpokenReply("Check back in 20 min later on.")).toBe(
      "Check back in twenty minutes later on."
    );
    expect(prepareSpokenReply("The wait is 15 min and it is close.")).toBe(
      "The wait is fifteen minutes and it is close."
    );

    // The defect this pins: never "a ten minutes wait".
    expect(prepareSpokenReply("It is a 10 min wait.")).not.toContain("ten minutes wait");
  });

  test("blank and non-string values remain unspeakable", () => {
    expect(prepareSpokenReply("   ")).toBeNull();
    expect(prepareSpokenReply(null)).toBeNull();
    expect(prepareSpokenReply(42)).toBeNull();
  });
});

describe("10. speech text bounds are enforced locally", () => {
  test("empty, blank and non-string replies are refused", () => {
    expect(validateSpeechText("").ok).toBe(false);
    expect(validateSpeechText("   \n  ").ok).toBe(false);
    expect(validateSpeechText(null).ok).toBe(false);
    expect(validateSpeechText(undefined).ok).toBe(false);
    expect(validateSpeechText(42).ok).toBe(false);
    expect(validateSpeechText("").reason).toBe("empty_text");
  });

  test("the ceiling is 600 characters and is enforced at the boundary", () => {
    expect(MAX_SPEECH_CHARS).toBe(600);

    expect(validateSpeechText("a".repeat(MAX_SPEECH_CHARS)).ok).toBe(true);

    const tooLong = validateSpeechText("a".repeat(MAX_SPEECH_CHARS + 1));
    expect(tooLong.ok).toBe(false);
    expect(tooLong.reason).toBe("text_too_long");
  });

  test("whitespace is collapsed so a multi-line reply is not read with dead air", () => {
    expect(normalizeSpeechText("Try  Peter Pan\n\nnow.")).toBe("Try Peter Pan now.");
    expect(validateSpeechText("  Head to Frontierland.  ").text).toBe("Head to Frontierland.");
    // Collapsing can bring an otherwise-oversized reply under the ceiling.
    expect(validateSpeechText(`${"a".repeat(600)}\n\n   `).ok).toBe(true);
  });

  test("empty and oversized audio payloads are refused", () => {
    expect(MAX_SPEECH_BYTES).toBe(2 * 1024 * 1024);
    expect(validateSpeechBlob({ size: 0 }).ok).toBe(false);
    expect(validateSpeechBlob(null).ok).toBe(false);
    expect(validateSpeechBlob({ size: MAX_SPEECH_BYTES }).ok).toBe(true);
    expect(validateSpeechBlob({ size: MAX_SPEECH_BYTES + 1 }).ok).toBe(false);
  });
});

/** Minimal Headers shape: only .get() is used by the helper. */
const headers = (map = {}) => ({
  get: (name) => {
    const key = String(name).toLowerCase();
    const found = Object.keys(map).find((k) => k.toLowerCase() === key);
    return found === undefined ? null : map[found];
  },
});

const audioResponse = (blob, extra = {}) => ({
  ok: true,
  status: 200,
  headers: headers({ "content-type": "audio/mpeg", ...extra }),
  blob: async () => blob,
});

describe("2. the frontend validates the claimed audio contract", () => {
  afterEach(() => {
    delete global.fetch;
  });

  test("a correct audio/mpeg response is accepted", async () => {
    const blob = { size: 4096, type: "audio/mpeg" };
    global.fetch = jest.fn(async () => audioResponse(blob));

    await expect(synthesizeSpeechAudio("a reply")).resolves.toBe(blob);
  });

  test("a missing or wrong response Content-Type is refused", async () => {
    const cases = [
      undefined,
      "",
      "application/json",
      "audio/ogg",
      "text/html; charset=utf-8",
      "video/mp4",
    ];

    for (const contentType of cases) {
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        headers: headers(contentType === undefined ? {} : { "content-type": contentType }),
        blob: async () => ({ size: 2048, type: "audio/mpeg" }),
      }));

      await expect(synthesizeSpeechAudio("a reply")).rejects.toMatchObject({
        category: "speech_unavailable",
      });
    }
  });

  test("MIME parameters and casing are handled deliberately", async () => {
    expect(normalizeAudioContentType("Audio/MPEG; charset=binary")).toBe("audio/mpeg");
    expect(normalizeAudioContentType("  AUDIO/MPEG  ")).toBe("audio/mpeg");
    expect(normalizeAudioContentType("audio/ogg;codecs=opus")).toBe("audio/ogg");
    expect(normalizeAudioContentType(null)).toBeNull();
    expect(isMpegAudioContentType("AUDIO/MPEG;charset=binary")).toBe(true);
    expect(isMpegAudioContentType("audio/ogg")).toBe(false);

    // and the same tolerance end to end
    const blob = { size: 1024, type: "AUDIO/MPEG; charset=binary" };
    global.fetch = jest.fn(async () =>
      audioResponse(blob, { "content-type": "Audio/MPEG; charset=binary" })
    );
    await expect(synthesizeSpeechAudio("a reply")).resolves.toBe(blob);
  });

  test("empty audio is refused", async () => {
    global.fetch = jest.fn(async () => audioResponse({ size: 0, type: "audio/mpeg" }));

    await expect(synthesizeSpeechAudio("a reply")).rejects.toMatchObject({
      category: "speech_unavailable",
    });
  });

  test("exactly 2 MB is accepted; more than 2 MB is refused", async () => {
    const exact = { size: MAX_SPEECH_BYTES, type: "audio/mpeg" };
    global.fetch = jest.fn(async () => audioResponse(exact));
    await expect(synthesizeSpeechAudio("a reply")).resolves.toBe(exact);

    global.fetch = jest.fn(async () =>
      audioResponse({ size: MAX_SPEECH_BYTES + 1, type: "audio/mpeg" })
    );
    await expect(synthesizeSpeechAudio("a reply")).rejects.toMatchObject({
      category: "speech_unavailable",
    });
  });

  test("an oversized Content-Length is refused BEFORE the body is read", async () => {
    const blobSpy = jest.fn(async () => ({ size: 1024, type: "audio/mpeg" }));
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: headers({
        "content-type": "audio/mpeg",
        "content-length": String(MAX_SPEECH_BYTES + 1),
      }),
      blob: blobSpy,
    }));

    await expect(synthesizeSpeechAudio("a reply")).rejects.toMatchObject({
      category: "speech_unavailable",
    });
    expect(blobSpy).not.toHaveBeenCalled();
  });

  test("a malformed Content-Length is refused before the body is read", async () => {
    for (const value of ["not-a-number", "-1", "1.5", "NaN"]) {
      const blobSpy = jest.fn(async () => ({ size: 1024, type: "audio/mpeg" }));
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        headers: headers({ "content-type": "audio/mpeg", "content-length": value }),
        blob: blobSpy,
      }));

      await expect(synthesizeSpeechAudio("a reply")).rejects.toMatchObject({
        category: "speech_unavailable",
      });
      expect(blobSpy).not.toHaveBeenCalled();
    }
  });

  test("a Blob whose own type contradicts the header is refused", async () => {
    global.fetch = jest.fn(async () => audioResponse({ size: 2048, type: "audio/ogg" }));

    await expect(synthesizeSpeechAudio("a reply")).rejects.toMatchObject({
      category: "speech_unavailable",
    });
  });

  test("a blank Blob type is accepted — the header already proved the format", () => {
    // Some browsers leave blob.type empty even for a correctly labelled
    // response; rejecting those would break real playback for no safety gain.
    expect(validateSpeechBlob({ size: 1024, type: "" }).ok).toBe(true);
    expect(validateSpeechBlob({ size: 1024 }).ok).toBe(true);
    expect(validateSpeechBlob({ size: 1024, type: "audio/mpeg" }).ok).toBe(true);
    expect(validateSpeechBlob({ size: 1024, type: "audio/ogg" }).ok).toBe(false);
  });
});

describe("11. the speech request is bounded and leaks nothing", () => {
  afterEach(() => {
    delete global.fetch;
  });

  test("sends JSON once to /api/voice/speak and returns the audio Blob", async () => {
    const calls = [];
    const audio = { size: 4096, type: "audio/mpeg" };

    global.fetch = jest.fn(async (url, options) => {
      calls.push({ url, options });
      return audioResponse(audio);
    });

    const result = await synthesizeSpeechAudio("  Head to  Frontierland now.  ");

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toMatch(/\/api\/voice\/speak$/);
    expect(calls[0].options.method).toBe("POST");
    expect(calls[0].options.headers["Content-Type"]).toBe("application/json");
    // Whitespace-collapsed, so the request carries exactly what will be spoken.
    expect(JSON.parse(calls[0].options.body)).toEqual({
      text: "Head to Frontierland now.",
    });
    expect(result).toBe(audio);
  });

  test("is never retried", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 503 }));

    await expect(synthesizeSpeechAudio("anything")).rejects.toMatchObject({
      category: "speech_unavailable",
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    global.fetch = jest.fn(async () => {
      throw new Error("Failed to fetch");
    });
    await expect(synthesizeSpeechAudio("anything")).rejects.toMatchObject({
      category: "speech_unavailable",
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("bounded categories only — no provider, status or upstream text escapes", async () => {
    const cases = [
      [400, "empty_text"],
      [413, "text_too_long"],
      [429, "rate_limited"],
      [503, "speech_unavailable"],
      [500, "speech_unavailable"],
    ];

    for (const [status, category] of cases) {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status,
        // Deliberately hostile body. It must never be read or surfaced.
        text: async () => "OpenAI tts-1 upstream said sk-secret",
        json: async () => ({ error: "openai exploded" }),
        blob: async () => ({ size: 10 }),
      }));

      let caught;
      try {
        await synthesizeSpeechAudio("a reply");
      } catch (err) {
        caught = err;
      }

      expect(caught.category).toBe(category);
      expect(caught.message).toBe(category);
      expect(caught.message).not.toMatch(/openai|sk-secret|tts/i);
    }
  });

  test("bounds are refused before any request is made", async () => {
    const spy = jest.fn();
    global.fetch = spy;

    await expect(synthesizeSpeechAudio("   ")).rejects.toMatchObject({
      category: "empty_text",
    });
    await expect(synthesizeSpeechAudio("a".repeat(601))).rejects.toMatchObject({
      category: "text_too_long",
    });

    expect(spy).not.toHaveBeenCalled();
  });

  test("an empty audio body is refused rather than played as silence", async () => {
    global.fetch = jest.fn(async () => audioResponse({ size: 0, type: "audio/mpeg" }));

    await expect(synthesizeSpeechAudio("a reply")).rejects.toMatchObject({
      category: "speech_unavailable",
    });
  });
});

describe("12. no key, spoken text or audio enters analytics", () => {
  test("speech-content keys are dropped from event metadata", () => {
    const sent = [];
    global.fetch = jest.fn(async (url, options) => {
      sent.push(JSON.parse(options.body));
      return { ok: true, status: 200, json: async () => ({}) };
    });

    trackEvent("voice_speech_probe", {
      source: "tohi_chat",
      metadata: {
        speech: "SPOKEN_SECRET",
        speechText: "SPOKEN_SECRET",
        spokenReply: "SPOKEN_SECRET",
        ttsText: "SPOKEN_SECRET",
        audioUrl: "blob:SECRET_URL",
        objectUrl: "blob:SECRET_URL",
        transcript: "SPOKEN_SECRET",
        durationMs: 1200,
      },
    });

    expect(sent).toHaveLength(1);
    const body = JSON.stringify(sent[0]);

    ["speech", "speechText", "spokenReply", "ttsText", "audioUrl", "objectUrl"].forEach((k) => {
      expect(sent[0].metadata[k]).toBeUndefined();
    });
    expect(body).not.toContain("SPOKEN_SECRET");
    expect(body).not.toContain("SECRET_URL");
    // A content-free counter still survives.
    expect(sent[0].metadata.durationMs).toBe(1200);

    delete global.fetch;
  });
});

describe("13. no synthesis, Realtime or always-listening behaviour", () => {
  test("the speech module exposes no browser-synthesis or socket API", () => {
    // eslint-disable-next-line global-require
    const speechModule = require("../utils/voiceSpeech");

    Object.keys(speechModule).forEach((key) => {
      expect(key).not.toMatch(/synthesis|utterance|realtime|socket|listen/i);
    });

    // eslint-disable-next-line global-require
    const fs = require("fs");
    // eslint-disable-next-line global-require
    const path = require("path");
    // Comments are stripped first. These files deliberately DOCUMENT that
    // browser synthesis and Realtime are not used, so matching raw text would
    // flag the very prose that promises the opposite.
    const stripComments = (text) =>
      text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

    const sources = ["utils/voiceSpeech.js", "api.js", "components/TohiTab.jsx"].map((rel) =>
      stripComments(fs.readFileSync(path.join(__dirname, "..", rel), "utf8"))
    );

    sources.forEach((src) => {
      expect(src).not.toMatch(/speechSynthesis|SpeechSynthesisUtterance/);
      expect(src).not.toMatch(/new WebSocket|RealtimeClient|\/realtime/i);
    });
  });

  test("playbackResultToPromise tolerates a non-Promise play() result", async () => {
    // jsdom and older browsers return undefined, not a Promise. Treating that
    // as a rejection would show a Play control on a browser that is happily
    // playing.
    await expect(playbackResultToPromise(undefined)).resolves.toBeUndefined();
    await expect(playbackResultToPromise(null)).resolves.toBeUndefined();
    await expect(playbackResultToPromise(Promise.resolve("x"))).resolves.toBe("x");
    await expect(playbackResultToPromise(Promise.reject(new Error("blocked")))).rejects.toThrow();
  });

  test("speech output support requires both an Audio constructor and object URLs", () => {
    expect(isSpeechOutputSupported({})).toBe(false);
    expect(isSpeechOutputSupported({ AudioCtor: function A() {} })).toBe(false);
    expect(isSpeechOutputSupported({ createObjectURL: () => "" })).toBe(false);
    expect(
      isSpeechOutputSupported({ AudioCtor: function A() {}, createObjectURL: () => "" })
    ).toBe(true);
  });
});

describe("15. presentation, day/night and accessibility", () => {
  test("no speech controls render when speech is unsupported", () => {
    const html = renderTohi(withVoice({ speechSupported: false }));

    expect(html).not.toContain('data-tohi-voice-replies="true"');
    expect(html).not.toContain('data-tohi-speech-playback="true"');
    expect(html).not.toContain(SPEECH_COPY.disclosure);
    // The microphone and typed composer are untouched.
    expect(html).toContain('data-tohi-voice="true"');
    expect(html).toContain('id="tohi-question"');
  });

  test("no speech controls render when voice input itself is unavailable", () => {
    const html = renderTohi({ voiceSupported: false, speechSupported: true });
    expect(html).not.toContain('data-tohi-voice-replies="true"');
    expect(html).toContain('id="tohi-question"');
  });

  test("the Voice Replies toggle is a real pressed-state button, on by default", () => {
    const on = renderTohi(withVoice());
    expect(on).toMatch(/<button[^>]*data-tohi-voice-replies="true"/);
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain(SPEECH_COPY.toggleOn);

    const off = renderTohi(withVoice({ voiceRepliesEnabled: false }));
    expect(off).toContain('aria-pressed="false"');
    expect(off).toContain(SPEECH_COPY.toggleOff);
  });

  test("the playback control is Stop while speaking and Play when blocked", () => {
    const speaking = renderTohi(withVoice({ speechState: "speaking" }));
    expect(speaking).toMatch(/<button[^>]*data-tohi-speech-playback="true"/);
    expect(speaking).toContain('aria-label="Stop reading the reply"');
    expect(speaking).toContain(SPEECH_COPY.stop);

    const blocked = renderTohi(withVoice({ speechState: "blocked" }));
    expect(blocked).toContain(`aria-label="${SPEECH_COPY.play}"`);
    expect(blocked).toContain(SPEECH_COPY.play);

    // Never a dead affordance when there is nothing to stop or start.
    const idle = renderTohi(withVoice({ speechState: "idle" }));
    expect(idle).not.toContain('data-tohi-speech-playback="true"');
  });

  test("the AI-voice disclosure is present and names no provider", () => {
    const html = renderTohi(withVoice());

    expect(html).toContain(SPEECH_COPY.disclosure);
    expect(SPEECH_COPY.disclosure).toBe("TOHI’s speaking voice is AI-generated.");
    expect(html.toLowerCase()).not.toMatch(/openai|tts-1|whisper|nova|anthropic/);
  });

  test("speech copy avoids every user-facing word CLAUDE.md bans", () => {
    const banned = /\b(system|algorithm|optimi[sz]e|execute|override|scoring|ranked|rated)\b/i;
    Object.values(SPEECH_COPY).forEach((copy) => {
      expect(copy).not.toMatch(banned);
    });
  });

  test("speech controls add no second live region and no media element", () => {
    const html = renderTohi(withVoice({ speechState: "speaking", chat: [] }));

    // The one explicit live region is still the conversation log.
    expect((html.match(/aria-live=/g) || []).length).toBe(1);
    expect(html).not.toContain('aria-live="assertive"');
    // The Audio element is owned by App and never rendered into the tree.
    expect(html).not.toMatch(/<audio\b/i);
  });

  test("night rendering uses the shared tokens, not a private palette", () => {
    const day = renderTohi(withVoice({ speechState: "speaking" }));
    const night = renderTohi(withVoice({ speechState: "speaking", night: true }));

    expect(day).toContain('data-tohi-speech-playback="true"');
    expect(night).toContain('data-tohi-speech-playback="true"');
    // Day and night must not be byte-identical — the tokens really did switch.
    expect(day).not.toBe(night);
  });
});
