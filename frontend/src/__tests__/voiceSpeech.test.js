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
  isMpegAudioContentType,
  isSpeechOutputSupported,
  normalizeAudioContentType,
  normalizeSpeechText,
  playbackResultToPromise,
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
