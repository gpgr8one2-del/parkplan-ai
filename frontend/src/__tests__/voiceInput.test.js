/**
 * TOHI Voice Phase A2 — push-to-talk input.
 *
 * WHAT THESE TESTS ARE, stated plainly so nothing reads as stronger than it is:
 *
 *   - They EXECUTE the real production helpers in src/utils/voiceRecording.js
 *     and the real transcribeVoiceRecording in src/api.js. Nothing is
 *     reimplemented here.
 *   - They EXECUTE the real TohiTab composer through react-dom/server, so the
 *     microphone's presence, disabled states and ARIA come from the component
 *     itself.
 *   - `fetch` is stubbed. No microphone, no network, no Anthropic call and no
 *     OpenAI call happens, and no API key is needed.
 *   - App.jsx's chat wiring — the single user-message insertion site, the shared
 *     session payload, QUICK CHECK, cleanup and staleness — is proved by the
 *     companion harness (frontend/scripts/voiceInputHarness.cjs), which can
 *     execute extracted App source. Those claims are not made here.
 */

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { TohiTab } from "../components/TohiTab";
import {
  MAX_AUDIO_BYTES,
  MAX_RECORDING_MS,
  RECORDING_MIME_CANDIDATES,
  VOICE_COPY,
  isSupportedRecordingMimeType,
  isVoiceInputSupported,
  resolveRecorderMimeType,
  resolveUploadContentType,
  selectRecordingMimeType,
  stopMediaStream,
  validateRecordingBlob,
  validateTranscript,
} from "../utils/voiceRecording";
import { transcribeVoiceRecording, trackEvent } from "../api";

/* Browser shapes, as the real ones behave for MediaRecorder.isTypeSupported. */
const IPHONE_SAFARI = (type) => type === "audio/mp4";
const ANDROID_CHROME = (type) =>
  type === "audio/webm" || type === "audio/webm;codecs=opus" || type === "audio/ogg;codecs=opus";

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

describe("1-2. recording format selection", () => {
  test("iPhone-style Safari records MP4, Android-style Chrome records WebM/Opus", () => {
    expect(selectRecordingMimeType(IPHONE_SAFARI)).toBe("audio/mp4");
    expect(selectRecordingMimeType(ANDROID_CHROME)).toBe("audio/webm;codecs=opus");
  });

  test("OGG is never a candidate and is never selected, even when it is the only thing offered", () => {
    RECORDING_MIME_CANDIDATES.forEach((candidate) => {
      expect(candidate).not.toMatch(/ogg/i);
    });

    // A browser that claims to support ONLY ogg must yield no format at all,
    // rather than falling through to recording something we cannot upload.
    const oggOnly = (type) => type === "audio/ogg" || type === "audio/ogg;codecs=opus";
    expect(selectRecordingMimeType(oggOnly)).toBeNull();

    expect(isSupportedRecordingMimeType("audio/ogg")).toBe(false);
    expect(isSupportedRecordingMimeType("audio/ogg;codecs=opus")).toBe(false);
  });

  test("the recorder's OWN reported type decides, and an unsupported one is refused", () => {
    // Supported actual wins, even when it differs from what was requested.
    expect(
      resolveRecorderMimeType({ mimeType: "audio/mp4" }, "audio/webm;codecs=opus")
    ).toBe("audio/mp4");
    expect(
      resolveRecorderMimeType({ mimeType: "  audio/webm;codecs=opus  " }, "audio/mp4")
    ).toBe("audio/webm;codecs=opus");

    // Blank/absent actual falls back to a SUPPORTED requested type.
    expect(resolveRecorderMimeType({ mimeType: "" }, "audio/mp4")).toBe("audio/mp4");
    expect(resolveRecorderMimeType({ mimeType: "   " }, "audio/webm")).toBe("audio/webm");
    expect(resolveRecorderMimeType({}, "audio/mp4")).toBe("audio/mp4");
    expect(resolveRecorderMimeType(null, "audio/mp4")).toBe("audio/mp4");

    // A nonblank but UNSUPPORTED actual returns null. It must NOT fall back to
    // the requested type: doing so would label Opus-in-Ogg bytes as WebM and
    // upload them under a content type that does not describe them.
    expect(resolveRecorderMimeType({ mimeType: "audio/ogg" }, "audio/webm")).toBeNull();
    expect(
      resolveRecorderMimeType({ mimeType: "audio/ogg;codecs=opus" }, "audio/webm;codecs=opus")
    ).toBeNull();
    expect(resolveRecorderMimeType({ mimeType: "video/mp4" }, "audio/mp4")).toBeNull();

    // An unsupported requested type is refused too, rather than passed through.
    expect(resolveRecorderMimeType({ mimeType: "" }, "audio/ogg")).toBeNull();
    expect(resolveRecorderMimeType(null, undefined)).toBeNull();
  });

  test("codec parameters survive to the upload Content-Type", () => {
    expect(resolveUploadContentType("audio/webm;codecs=opus", "audio/webm")).toBe(
      "audio/webm;codecs=opus"
    );
    // A browser that hands back a blank Blob type falls back to what it recorded.
    expect(resolveUploadContentType("", "audio/mp4")).toBe("audio/mp4");
    expect(resolveUploadContentType("audio/ogg", "audio/ogg")).toBeNull();
  });
});

describe("3-4. bounds are enforced before any upload", () => {
  test("a zero-byte recording is refused locally", () => {
    const result = validateRecordingBlob({ size: 0 }, "audio/webm");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("empty_audio");
  });

  test("an over-8MB recording is refused locally", () => {
    expect(MAX_AUDIO_BYTES).toBe(8 * 1024 * 1024);

    expect(validateRecordingBlob({ size: MAX_AUDIO_BYTES }, "audio/webm").ok).toBe(true);
    const tooBig = validateRecordingBlob({ size: MAX_AUDIO_BYTES + 1 }, "audio/webm");
    expect(tooBig.ok).toBe(false);
    expect(tooBig.reason).toBe("audio_too_large");
  });

  test("the recording ceiling is 30 seconds", () => {
    expect(MAX_RECORDING_MS).toBe(30000);
  });

  test("the API helper refuses an empty blob without making a request", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy;

    await expect(transcribeVoiceRecording({ size: 0 }, "audio/webm")).rejects.toMatchObject({
      category: "empty_audio",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("5-6. the transcription request", () => {
  afterEach(() => {
    delete global.fetch;
  });

  test("sends the raw Blob exactly once with the recorded Content-Type", async () => {
    const blob = { size: 2048, type: "audio/webm;codecs=opus" };
    const calls = [];

    global.fetch = jest.fn(async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, json: async () => ({ transcript: "  where is the parade  " }) };
    });

    const result = await transcribeVoiceRecording(blob, "audio/webm;codecs=opus");

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toMatch(/\/api\/voice\/transcribe$/);
    expect(calls[0].options.method).toBe("POST");
    // The Blob itself is the body — not JSON, not base64, not FormData.
    expect(calls[0].options.body).toBe(blob);
    expect(typeof calls[0].options.body).not.toBe("string");
    expect(calls[0].options.headers["Content-Type"]).toBe("audio/webm;codecs=opus");
    // No JSON content type leaked in from the shared helper.
    expect(Object.keys(calls[0].options.headers)).toEqual(["Content-Type"]);
    expect(result.transcript).toBe("where is the parade");
  });

  test("is never retried on failure", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 503 }));

    await expect(
      transcribeVoiceRecording({ size: 10 }, "audio/webm")
    ).rejects.toMatchObject({ category: "voice_unavailable" });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("is never retried on a network throw", async () => {
    global.fetch = jest.fn(async () => {
      throw new Error("Failed to fetch");
    });

    await expect(
      transcribeVoiceRecording({ size: 10 }, "audio/webm")
    ).rejects.toMatchObject({ category: "voice_unavailable" });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("bounded categories only — no provider, status or upstream text escapes", async () => {
    const cases = [
      [400, "empty_audio"],
      [413, "audio_too_large"],
      [415, "unsupported_audio"],
      [429, "rate_limited"],
      [503, "voice_unavailable"],
      [500, "voice_unavailable"],
    ];

    for (const [status, category] of cases) {
      global.fetch = jest.fn(async () => ({
        ok: false,
        status,
        // Deliberately hostile body. It must never be read or surfaced.
        text: async () => "OpenAI upstream said sk-secret",
        json: async () => ({ error: "openai exploded" }),
      }));

      let caught;
      try {
        await transcribeVoiceRecording({ size: 10 }, "audio/webm");
      } catch (err) {
        caught = err;
      }

      expect(caught.category).toBe(category);
      expect(caught.message).toBe(category);
      expect(JSON.stringify(caught.message)).not.toMatch(/openai|sk-secret/i);
    }
  });

  test("a malformed success payload becomes voice_unavailable, not a fake transcript", async () => {
    for (const payload of [{}, { transcript: 42 }, null, []]) {
      global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => payload }));

      await expect(
        transcribeVoiceRecording({ size: 10 }, "audio/webm")
      ).rejects.toMatchObject({ category: "voice_unavailable" });
    }
  });
});

describe("10. silence is not a question", () => {
  test("a blank transcript is rejected before submission", () => {
    expect(validateTranscript("   \n  ").ok).toBe(false);
    expect(validateTranscript("   \n  ").reason).toBe("blank");
    expect(validateTranscript("").ok).toBe(false);
    expect(validateTranscript(undefined).ok).toBe(false);

    const good = validateTranscript("  how long is the wait  ");
    expect(good.ok).toBe(true);
    expect(good.transcript).toBe("how long is the wait");
  });

  test("the helper trims a blank-but-valid provider transcript to empty", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ transcript: "   " }),
    }));

    const result = await transcribeVoiceRecording({ size: 10 }, "audio/webm");
    expect(result.transcript).toBe("");
    expect(validateTranscript(result.transcript).ok).toBe(false);
    delete global.fetch;
  });
});

describe("11-12. voice never degrades typed chat", () => {
  test("no microphone is rendered when the browser cannot record", () => {
    expect(isVoiceInputSupported({})).toBe(false);
    expect(isVoiceInputSupported({ mediaDevices: {}, MediaRecorderCtor: undefined })).toBe(false);
    expect(
      isVoiceInputSupported({
        mediaDevices: { getUserMedia: () => {} },
        MediaRecorderCtor: Object.assign(function R() {}, { isTypeSupported: () => false }),
      })
    ).toBe(false);

    const html = renderTohi({ voiceSupported: false });
    expect(html).not.toContain('data-tohi-voice="true"');
    expect(html).not.toContain(VOICE_COPY.privacy);
  });

  test("the typed composer is intact with voice absent, and with voice present", () => {
    const withoutVoice = renderTohi({ voiceSupported: false });
    const withVoice = renderTohi({ voiceSupported: true, onVoicePress: () => {} });

    [withoutVoice, withVoice].forEach((html) => {
      expect(html).toContain('id="tohi-question"');
      expect(html).toContain('placeholder="Ask TOHI..."');
      expect(html).toContain("Send");
      expect(html).toContain("<form");
    });

    expect(withVoice).toContain('data-tohi-voice="true"');
  });

  test("permission denial only changes the status copy; the input stays enabled", () => {
    const html = renderTohi({
      voiceSupported: true,
      onVoicePress: () => {},
      voiceState: "idle",
      voiceBusy: false,
      voiceStatusMessage: VOICE_COPY.denied,
      message: "typed question",
    });

    expect(html).toContain(VOICE_COPY.denied);
    // The Send button is live: the only disabled= in the composer must not be it.
    expect(html).toMatch(/<button[^>]*type="submit"(?![^>]*disabled)/);
    expect(html).not.toContain("Microphone access is off. You can still type your question.</div>disabled");
  });
});

describe("13. competing submissions and rapid taps", () => {
  test("a typed submit is blocked while voice is listening or transcribing", () => {
    ["listening", "transcribing"].forEach((voiceState) => {
      const html = renderTohi({
        voiceSupported: true,
        onVoicePress: () => {},
        voiceState,
        voiceBusy: true,
        message: "a typed question",
      });
      expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
    });
  });

  test("typing is restored the moment the voice attempt ends", () => {
    const html = renderTohi({
      voiceSupported: true,
      onVoicePress: () => {},
      voiceState: "idle",
      voiceBusy: false,
      voiceStatusMessage: VOICE_COPY.failed,
      message: "a typed question",
    });
    expect(html).toMatch(/<button[^>]*type="submit"(?![^>]*disabled)/);
  });

  test("the microphone refuses taps while a permission prompt or upload is pending", () => {
    ["requesting", "transcribing"].forEach((voiceState) => {
      const html = renderTohi({
        voiceSupported: true,
        onVoicePress: () => {},
        voiceState,
        voiceBusy: true,
      });
      expect(html).toMatch(/<button[^>]*data-tohi-voice="true"[^>]*disabled/);
      expect(html).toContain('aria-busy="true"');
    });

    // Listening is tappable — that is how the guest stops.
    const listening = renderTohi({
      voiceSupported: true,
      onVoicePress: () => {},
      voiceState: "listening",
      voiceBusy: true,
    });
    expect(listening).toMatch(/<button[^>]*data-tohi-voice="true"(?![^>]*disabled)/);
    expect(listening).toContain('aria-pressed="true"');
  });
});

describe("14. every microphone track is stopped", () => {
  test("stopMediaStream stops all tracks and is safe to repeat", () => {
    const stops = [];
    const track = (id) => ({ stop: () => stops.push(id) });
    const stream = { getTracks: () => [track("a"), track("b")] };

    expect(stopMediaStream(stream)).toBe(2);
    expect(stops).toEqual(["a", "b"]);

    expect(stopMediaStream(null)).toBe(0);
    expect(stopMediaStream(undefined)).toBe(0);
    expect(stopMediaStream({})).toBe(0);
  });

  test("one throwing track does not strand the others", () => {
    const stopped = [];
    const stream = {
      getTracks: () => [
        {
          stop: () => {
            throw new Error("device busy");
          },
        },
        { stop: () => stopped.push("second") },
      ],
    };

    expect(() => stopMediaStream(stream)).not.toThrow();
    expect(stopped).toEqual(["second"]);
  });
});

describe("17. voice content cannot enter analytics", () => {
  test("voice-content keys are dropped from event metadata", () => {
    const sent = [];
    global.fetch = jest.fn(async (url, options) => {
      sent.push(JSON.parse(options.body));
      return { ok: true, status: 200, json: async () => ({}) };
    });

    trackEvent("voice_test_event", {
      source: "tohi_chat",
      metadata: {
        transcript: "where is the closest bathroom",
        transcription: "where is the closest bathroom",
        spokenText: "where is the closest bathroom",
        audio: "AAAABBBB",
        audioBlob: "AAAABBBB",
        recording: "AAAABBBB",
        message: "typed secret",
        durationMs: 4200,
      },
    });

    expect(sent).toHaveLength(1);
    const body = JSON.stringify(sent[0]);

    ["transcript", "transcription", "spokenText", "audioBlob", "recording"].forEach((key) => {
      expect(sent[0].metadata[key]).toBeUndefined();
    });
    expect(sent[0].metadata.audio).toBeUndefined();
    expect(body).not.toContain("where is the closest bathroom");
    expect(body).not.toContain("AAAABBBB");
    expect(body).not.toContain("typed secret");

    // A content-free counter still survives, so useful analytics stay possible.
    expect(sent[0].metadata.durationMs).toBe(4200);

    delete global.fetch;
  });
});

describe("20. accessibility and scope", () => {
  test("the microphone is a real button with accurate labels and a 48px target", () => {
    const idle = renderTohi({ voiceSupported: true, onVoicePress: () => {} });

    expect(idle).toMatch(/<button[^>]*data-tohi-voice="true"/);
    expect(idle).toContain('type="button"');
    expect(idle).toContain(`aria-label="${VOICE_COPY.idle}"`);
    expect(idle).toContain('aria-pressed="false"');
    expect(idle).toMatch(/min-height:48px/);
    expect(idle).toMatch(/min-width:48px/);

    const listening = renderTohi({
      voiceSupported: true,
      onVoicePress: () => {},
      voiceState: "listening",
      voiceBusy: true,
    });
    expect(listening).toContain('aria-label="Stop recording your question"');
    expect(listening).toContain('aria-pressed="true"');
  });

  test("microphone state announces in its own status region, never in the conversation log", () => {
    const html = renderTohi({
      voiceSupported: true,
      onVoicePress: () => {},
      voiceState: "listening",
      voiceBusy: true,
      voiceStatusMessage: VOICE_COPY.listening,
      chat: [{ role: "user", content: "hi" }],
    });

    expect(html).toContain('data-tohi-voice-status="true"');
    expect(html).toContain(VOICE_COPY.listening);

    // The status text is outside the log element.
    const logStart = html.indexOf('role="log"');
    const logEnd = html.indexOf('aria-hidden="true"', logStart);
    expect(html.slice(logStart, logEnd)).not.toContain(VOICE_COPY.listening);

    // No second explicit live region was introduced anywhere.
    expect(html).not.toContain('aria-live="assertive"');
  });

  test("the privacy line is present and names no provider", () => {
    const html = renderTohi({ voiceSupported: true, onVoicePress: () => {} });

    expect(html).toContain(VOICE_COPY.privacy);
    expect(VOICE_COPY.privacy).toBe(
      "Your recording is used only to turn your question into text."
    );
    expect(html.toLowerCase()).not.toMatch(/openai|whisper|render\.com|anthropic/);
  });

  test("speech is server-rendered only — no browser synthesis or media element", () => {
    const html = renderTohi({
      voiceSupported: true,
      onVoicePress: () => {},
      chat: [{ role: "assistant", content: "Try Peter Pan now." }],
    });

    // 64C-A3 added an approved spoken reply. What is still forbidden here:
    // no media element is rendered into the tree (the single Audio element is
    // owned by App), and the browser's own synthesis voice is never used, not
    // even as a hidden fallback.
    //
    // Asserted against real DOM/API surfaces rather than English words — the
    // markup legitimately contains "listening" in a CSS selector and a status
    // string, and matching prose would flag those instead of a real regression.
    expect(html).not.toMatch(/<audio\b/i);
    expect(html).not.toMatch(/<video\b/i);
    expect(html).not.toMatch(/speechSynthesis/i);
    expect(html).not.toMatch(/SpeechSynthesisUtterance/);

    // The assistant reply is rendered as text only.
    expect(html).toContain("Try Peter Pan now.");
  });

  test("the voice INPUT module stays input-only", () => {
    // Source-level, because a playback path could exist without rendering
    // anything. This is the module this phase owns.
    // eslint-disable-next-line global-require
    const voiceModule = require("../utils/voiceRecording");

    // Recording stays recording. Playback and synthesis live in the separate
    // A3 module, so this one must never grow either.
    Object.keys(voiceModule).forEach((key) => {
      expect(key).not.toMatch(/speak|speech|tts|play|utterance|audioOut/i);
    });

    // A3's speech helper is a SEPARATE export. What must never appear anywhere
    // in the API surface is a browser-synthesis path.
    // eslint-disable-next-line global-require
    const apiModule = require("../api");
    Object.keys(apiModule).forEach((key) => {
      expect(key).not.toMatch(/speechSynthesis|utterance/i);
    });
  });
});
