/**
 * TOHI Voice Phase A3 — REAL App integration for spoken replies.
 *
 * Mounts the ACTUAL <App /> and drives real clicks, real MediaRecorder events
 * and real playback outcomes. This is the only evidence in this phase for
 * claims source matching cannot establish: which origin speaks, playback
 * ordering, autoplay rejection, cancellation races, and object-URL lifecycle.
 *
 * `../api` is mocked. No network, no Anthropic call, no OpenAI call, no key.
 *
 * jsdom has no media stack: HTMLMediaElement.play() is not implemented and
 * URL.createObjectURL does not exist. Both are installed here as controllable
 * fakes so playback outcomes can be chosen per test.
 */

import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";

// CRA's Jest preset sets resetMocks:true, which strips factory implementations.
// Implementations are installed in beforeEach.
jest.mock("../api", () => {
  const actual = jest.requireActual("../api");

  return {
    __esModule: true,
    ...actual,
    trackEvent: jest.fn(),
    fetchParkData: jest.fn(),
    fetchWeather: jest.fn(),
    sendTohiPickReview: jest.fn(),
    sendChatMessage: jest.fn(),
    transcribeVoiceRecording: jest.fn(),
    synthesizeSpeechAudio: jest.fn(),
  };
});

import App from "../App";
import {
  fetchParkData,
  fetchWeather,
  sendChatMessage,
  sendTohiPickReview,
  synthesizeSpeechAudio,
  transcribeVoiceRecording,
} from "../api";
import {
  SPEECH_COPY,
  SPOKEN_DETAIL_NOTE,
  validateSpeechText,
} from "../utils/voiceSpeech";

const DEFAULT_REPLY = "Head to Frontierland now.";
// Deliberately free of weather/safety wording. Replies that mention shade,
// water, sun or indoor options are preserved complete by design, so such a
// fixture could not demonstrate shortening. That behaviour has its own test.
const LONG_VISIBLE_REPLY =
  "Head to Pirates of the Caribbean now — it’s a 10-minute wait, " +
  "and one of your must-dos for today. After that, keep Haunted Mansion and Jungle Cruise " +
  "on the screen as flexible backups while you decide whether the family wants another ride or a break.";

/** The exact spoken rendering of LONG_VISIBLE_REPLY, asserted as a literal. */
const LONG_SPOKEN_REPLY =
  "Head to Pirates of the Caribbean now, it’s a ten minute wait, and one of your must-dos for today. " +
  "I’ve put the rest of the details on your screen.";
// Deliberately NOT an open-ended "what should we do next" phrasing: that is
// intercepted by QUICK CHECK before the AI. The QUICK CHECK path is exercised
// explicitly in its own describe block below.
const DEFAULT_TRANSCRIPT = "where is the parade";

const COMPLETE_PROFILE = {
  adultCount: 2,
  childCount: 1,
  children: [{ age: 8, heightInches: 50 }],
  thrillTolerance: "moderate",
  pace: "balanced",
  heatSensitivity: "medium",
  waterRidePreference: "maybe",
  stormTolerance: "cautious",
  priorities: ["characters"],
  tripContext: {
    tripStartDate: "2026-09-01",
    tripEndDate: "2026-09-05",
    parkSelectionIds: ["magic_kingdom"],
    firstParkId: "magic_kingdom",
    mostImportantParkId: "magic_kingdom",
  },
};

global.IS_REACT_ACT_ENVIRONMENT = true;

/* ------------------------- fake microphone stack ------------------------- */

let recorders;
let streams;
let getUserMediaImpl;

class FakeMediaRecorder {
  static isTypeSupported(type) {
    return type === "audio/webm" || type === "audio/webm;codecs=opus";
  }

  constructor(stream, options = {}) {
    this.stream = stream;
    this.state = "inactive";
    this.mimeType = options.mimeType || "";
    this.ondataavailable = null;
    this.onstop = null;
    this.onerror = null;
    recorders.push(this);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.state = "inactive";
  }

  emitData(bytes) {
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob([new Uint8Array(bytes)]) });
    }
  }

  emitStop() {
    if (this.onstop) this.onstop();
  }
}

function makeStream(label) {
  const tracks = [{ stopped: false, stop() { this.stopped = true; } }];
  const stream = { label, getTracks: () => tracks, tracks };
  streams.push(stream);
  return stream;
}

/* --------------------------- fake audio stack ---------------------------- */

let audioElements;
let createdUrls;
let revokedUrls;
let urlSeq;
/** Controls what the next play() attempt does. */
let playOutcome;

class FakeAudio {
  constructor() {
    this.src = "";
    this.paused = true;
    this.playCalls = 0;
    this.pauseCalls = 0;
    this.onended = null;
    this.onerror = null;
    audioElements.push(this);
  }

  play() {
    this.playCalls += 1;

    if (playOutcome === "reject") {
      return Promise.reject(new Error("NotAllowedError"));
    }
    if (playOutcome === "undefined") {
      // jsdom / older browsers: not a Promise at all.
      this.paused = false;
      return undefined;
    }

    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.pauseCalls += 1;
    this.paused = true;
  }

  removeAttribute(name) {
    if (name === "src") this.src = "";
  }

  load() {}

  /** True only when BOTH handlers have been detached. */
  get handlersDetached() {
    return this.onended === null && this.onerror === null;
  }
}

/* ------------------------------ mount helpers ---------------------------- */

let container;
let root;

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function mountApp() {
  container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => {
    root = createRoot(container);
    root.render(React.createElement(App));
  });
}

async function unmountApp() {
  if (root) await act(async () => root.unmount());
  if (container) container.remove();
  root = null;
  container = null;
}

async function click(el) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
}

const tabButton = (label) =>
  Array.from(document.querySelectorAll('nav[aria-label="Primary"] button')).find(
    (b) => (b.textContent || "").trim() === label
  );

const micButton = () => container.querySelector('[data-tohi-voice="true"]');
const repliesToggle = () => container.querySelector('[data-tohi-voice-replies="true"]');
const playbackButton = () => container.querySelector('[data-tohi-speech-playback="true"]');
const questionInput = () => container.querySelector("#tohi-question");

function userMessages() {
  const log = container.querySelector('[role="log"]');
  if (!log) return [];
  return Array.from(log.children)
    .filter((e) => (e.textContent || "").startsWith("YOU"))
    .map((e) => e.textContent.replace(/^YOU/, "").trim());
}

function assistantMessages() {
  const log = container.querySelector('[role="log"]');
  if (!log) return [];
  return Array.from(log.children)
    .filter((e) => (e.textContent || "").startsWith("TOHI"))
    .map((e) => e.textContent.replace(/^TOHI/, "").trim());
}

async function openTohiTab() {
  await click(tabButton("TOHI"));
  expect(questionInput()).toBeTruthy();
}

async function leaveTohiTab() {
  await click(tabButton("Home"));
}

async function typeAndSend(text) {
  const input = questionInput();
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(
      input,
      text
    );
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    Array.from(container.querySelectorAll('button[type="submit"]'))
      .find((b) => (b.textContent || "").includes("Send"))
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
}

/** Start → data → Stop → onstop → transcript submitted → reply committed. */
async function completeVoiceTurn() {
  await click(micButton());
  const recorder = recorders[recorders.length - 1];
  recorder.emitData(2048);
  await click(micButton());
  await act(async () => recorder.emitStop());
  await flush();
  return recorder;
}

beforeEach(() => {
  recorders = [];
  streams = [];
  audioElements = [];
  createdUrls = [];
  revokedUrls = [];
  urlSeq = 0;
  playOutcome = "resolve";

  getUserMediaImpl = jest.fn(async () => makeStream(`stream-${streams.length}`));

  localStorage.clear();
  localStorage.setItem("parkplan.familyProfile", JSON.stringify(COMPLETE_PROFILE));

  window.MediaRecorder = FakeMediaRecorder;
  window.Audio = FakeAudio;
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: (...a) => getUserMediaImpl(...a) },
  });

  window.URL.createObjectURL = jest.fn(() => {
    urlSeq += 1;
    const url = `blob:tohi-${urlSeq}`;
    createdUrls.push(url);
    return url;
  });
  window.URL.revokeObjectURL = jest.fn((url) => revokedUrls.push(url));

  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));

  fetchParkData.mockImplementation(async () => ({
    rides: [],
    source: "test",
    fetchedAt: new Date().toISOString(),
    ageMs: 0,
  }));
  fetchWeather.mockImplementation(async () => null);
  sendTohiPickReview.mockImplementation(async () => ({}));
  sendChatMessage.mockImplementation(async () => ({ reply: DEFAULT_REPLY }));
  transcribeVoiceRecording.mockImplementation(async () => ({ transcript: DEFAULT_TRANSCRIPT }));
  synthesizeSpeechAudio.mockImplementation(async () => ({ size: 4096, type: "audio/mpeg" }));
});

afterEach(async () => {
  await unmountApp();
  delete global.fetch;
  delete window.URL.createObjectURL;
  delete window.URL.revokeObjectURL;
});

/* ========================================================================== */

describe("1-2. only voice-origin replies speak", () => {
  test("a voice-origin reply requests speech exactly once and plays it", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();

    expect(assistantMessages()).toEqual([DEFAULT_REPLY]);
    expect(synthesizeSpeechAudio).toHaveBeenCalledTimes(1);
    // A short already-natural reply needs no speech-only shortening.
    expect(synthesizeSpeechAudio).toHaveBeenCalledWith(DEFAULT_REPLY);

    expect(audioElements).toHaveLength(1);
    expect(audioElements[0].playCalls).toBe(1);
    expect(createdUrls).toHaveLength(1);
    expect(audioElements[0].src).toBe(createdUrls[0]);
  });

  test("a longer voice reply stays complete on screen but uses its shorter spoken rendering", async () => {
    await mountApp();
    await openTohiTab();

    sendChatMessage.mockImplementationOnce(async () => ({ reply: LONG_VISIBLE_REPLY }));
    await completeVoiceTurn();

    // The complete answer stays on screen, unchanged.
    expect(assistantMessages()).toEqual([LONG_VISIBLE_REPLY]);

    // The spoken rendering is asserted as a LITERAL. Comparing against another
    // call to prepareSpokenReply would let a defect in preparation satisfy both
    // sides of the assertion at once.
    expect(synthesizeSpeechAudio).toHaveBeenCalledTimes(1);
    expect(synthesizeSpeechAudio).toHaveBeenCalledWith(LONG_SPOKEN_REPLY);
    expect(LONG_SPOKEN_REPLY).toContain(SPOKEN_DETAIL_NOTE);
    expect(LONG_SPOKEN_REPLY).not.toContain("Jungle Cruise");
    expect(validateSpeechText(LONG_SPOKEN_REPLY).ok).toBe(true);
  });

  test("a reply that mentions shade or water is spoken complete, never summarized", async () => {
    await mountApp();
    await openTohiTab();

    const heatReply =
      "This is the window where families usually wait too long to cool down. " +
      "Use water, AC, food, shade, or a seated show before the day gets harder. " +
      "Big Thunder Mountain can wait until the sun drops.";
    sendChatMessage.mockImplementationOnce(async () => ({ reply: heatReply }));
    await completeVoiceTurn();

    // The committed visible reply is the source of truth: TOHI's existing chat
    // cleaning may already have trimmed it before speech ever sees it.
    const visible = assistantMessages()[0];
    const spoken = synthesizeSpeechAudio.mock.calls[0][0];

    expect(spoken).toContain("Use water, AC, food, shade, or a seated show");
    // Every sentence of the committed guidance survives into speech.
    visible
      .split(". ")
      .map((fragment) => fragment.replace(/\.$/, "").trim())
      .filter(Boolean)
      .forEach((fragment) => expect(spoken).toContain(fragment));
    expect(spoken).not.toContain(SPOKEN_DETAIL_NOTE);
  });

  test("a typed reply never requests speech", async () => {
    await mountApp();
    await openTohiTab();
    await typeAndSend("how long is the wait for space mountain");

    expect(assistantMessages()).toEqual([DEFAULT_REPLY]);
    expect(synthesizeSpeechAudio).not.toHaveBeenCalled();
    expect(audioElements).toHaveLength(0);
    expect(createdUrls).toHaveLength(0);
  });

  test("a typed turn AFTER a voice turn still does not speak", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();
    expect(synthesizeSpeechAudio).toHaveBeenCalledTimes(1);

    await typeAndSend("and what about lunch");

    // Still one — the typed turn added nothing.
    expect(synthesizeSpeechAudio).toHaveBeenCalledTimes(1);
    expect(userMessages()).toEqual([DEFAULT_TRANSCRIPT, "and what about lunch"]);
  });

  test("the reply is not spoken when Voice Replies is switched off", async () => {
    await mountApp();
    await openTohiTab();

    await click(repliesToggle());
    expect(repliesToggle().getAttribute("aria-pressed")).toBe("false");

    await completeVoiceTurn();

    expect(assistantMessages()).toEqual([DEFAULT_REPLY]);
    expect(synthesizeSpeechAudio).not.toHaveBeenCalled();
  });
});

describe("3. QUICK CHECK speaks only when voice-originated", () => {
  test("a voice-origin QUICK CHECK speaks its clarifying question", async () => {
    await mountApp();
    await openTohiTab();

    transcribeVoiceRecording.mockImplementation(async () => ({
      transcript: "what should we do next",
    }));
    await completeVoiceTurn();

    // Intercepted before the AI, and still spoken.
    expect(sendChatMessage).not.toHaveBeenCalled();
    expect(container.querySelector('[role="log"]').textContent).toContain("QUICK CHECK");
    expect(synthesizeSpeechAudio).toHaveBeenCalledTimes(1);
  });

  test("a typed QUICK CHECK does not speak", async () => {
    await mountApp();
    await openTohiTab();
    await typeAndSend("what should we do next");

    expect(sendChatMessage).not.toHaveBeenCalled();
    expect(container.querySelector('[role="log"]').textContent).toContain("QUICK CHECK");
    expect(synthesizeSpeechAudio).not.toHaveBeenCalled();
  });
});

describe("4. speech failure never touches the text", () => {
  test("a failed synthesis leaves the reply visible and unmarked", async () => {
    await mountApp();
    await openTohiTab();

    synthesizeSpeechAudio.mockImplementation(async () => {
      const err = new Error("speech_unavailable");
      err.category = "speech_unavailable";
      throw err;
    });

    await completeVoiceTurn();

    expect(assistantMessages()).toEqual([DEFAULT_REPLY]);
    // Not the connection-failure entry.
    expect(container.textContent).not.toContain("TOHI couldn’t connect right now");
    expect(container.textContent).toContain(SPEECH_COPY.failed);
    expect(revokedUrls).toEqual([]);
  });

  test("a connection failure never speaks", async () => {
    await mountApp();
    await openTohiTab();

    sendChatMessage.mockImplementation(async () => {
      throw new Error("network down");
    });

    await completeVoiceTurn();

    expect(container.textContent).toContain("TOHI couldn’t connect right now");
    expect(synthesizeSpeechAudio).not.toHaveBeenCalled();
  });
});

describe("5-6. autoplay rejection and Stop", () => {
  test("a rejected autoplay preserves the text and exposes a Play control", async () => {
    await mountApp();
    await openTohiTab();

    playOutcome = "reject";
    await completeVoiceTurn();

    expect(assistantMessages()).toEqual([DEFAULT_REPLY]);
    expect(playbackButton()).toBeTruthy();
    expect(playbackButton().getAttribute("aria-label")).toBe(SPEECH_COPY.play);
    // The audio is still attached, so one tap can start it.
    expect(audioElements[0].src).toBe(createdUrls[0]);
    expect(revokedUrls).toEqual([]);

    // The tap is a real user gesture and plays the retained audio.
    playOutcome = "resolve";
    await click(playbackButton());
    expect(audioElements[0].playCalls).toBe(2);
    expect(playbackButton().getAttribute("aria-label")).toBe("Stop reading the reply");
  });

  test("Stop halts playback and releases the object URL", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();

    expect(playbackButton().getAttribute("aria-label")).toBe("Stop reading the reply");

    await click(playbackButton());

    expect(audioElements[0].pauseCalls).toBe(1);
    expect(revokedUrls).toEqual([createdUrls[0]]);
    expect(playbackButton()).toBeNull();
  });

  test("a play() that returns undefined is treated as playing, not blocked", async () => {
    await mountApp();
    await openTohiTab();

    playOutcome = "undefined";
    await completeVoiceTurn();

    expect(playbackButton().getAttribute("aria-label")).toBe("Stop reading the reply");
  });
});

describe("7-8. new recordings and newer replies invalidate older speech", () => {
  test("starting another recording stops speech immediately", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();

    expect(audioElements[0].paused).toBe(false);

    await click(micButton()); // start a new recording

    expect(audioElements[0].pauseCalls).toBe(1);
    expect(revokedUrls).toEqual([createdUrls[0]]);
    expect(playbackButton()).toBeNull();
  });

  test("a newer reply replaces older speech and reuses ONE Audio element", async () => {
    await mountApp();
    await openTohiTab();

    await completeVoiceTurn();
    transcribeVoiceRecording.mockImplementation(async () => ({ transcript: "and after that" }));
    sendChatMessage.mockImplementation(async () => ({ reply: "Then take a break." }));
    await completeVoiceTurn();

    expect(synthesizeSpeechAudio).toHaveBeenCalledTimes(2);
    // One element for the whole session — this is what keeps iOS playable.
    expect(audioElements).toHaveLength(1);
    expect(createdUrls).toHaveLength(2);
    // The first URL was revoked; the second is attached.
    expect(revokedUrls).toContain(createdUrls[0]);
    expect(audioElements[0].src).toBe(createdUrls[1]);
  });

  test("a stale synthesis resolving after a newer one does not play or leak", async () => {
    await mountApp();
    await openTohiTab();

    let releaseFirst;
    synthesizeSpeechAudio.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseFirst = () => resolve({ size: 1024, type: "audio/mpeg" });
        })
    );

    // First turn: synthesis hangs.
    await completeVoiceTurn();
    expect(createdUrls).toHaveLength(0);

    // Second turn resolves normally and takes ownership.
    synthesizeSpeechAudio.mockImplementation(async () => ({ size: 2048, type: "audio/mpeg" }));
    await completeVoiceTurn();
    expect(createdUrls).toHaveLength(1);

    // Now the abandoned first synthesis lands.
    await act(async () => releaseFirst());
    await flush();

    // It neither created a URL nor took over the element.
    expect(createdUrls).toHaveLength(1);
    expect(audioElements[0].src).toBe(createdUrls[0]);
    expect(audioElements[0].playCalls).toBe(1);
  });
});

describe("9. leaving TOHI, page hide and unmount release audio", () => {
  test("leaving the TOHI tab stops playback and revokes the URL", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();

    await leaveTohiTab();

    expect(audioElements[0].pauseCalls).toBe(1);
    expect(revokedUrls).toEqual([createdUrls[0]]);
  });

  test("page hide stops playback and revokes the URL", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();

    await act(async () => {
      window.dispatchEvent(new Event("pagehide"));
    });
    await flush();

    expect(audioElements[0].pauseCalls).toBe(1);
    expect(revokedUrls).toEqual([createdUrls[0]]);
  });

  test("unmount stops playback and revokes the URL", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();

    await unmountApp();

    expect(audioElements[0].pauseCalls).toBe(1);
    expect(revokedUrls).toEqual([createdUrls[0]]);
  });
});

describe("1. a newly accepted typed question cancels existing speech", () => {
  test("an actively playing reply is stopped and its URL revoked by a typed question", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();

    // TOHI is reading the answer out loud.
    expect(audioElements[0].paused).toBe(false);
    expect(revokedUrls).toEqual([]);

    await typeAndSend("actually, where is the nearest bathroom");

    expect(audioElements[0].pauseCalls).toBe(1);
    expect(revokedUrls).toEqual([createdUrls[0]]);
    expect(playbackButton()).toBeNull();
    // The typed turn itself still went through normally.
    expect(userMessages()).toEqual([DEFAULT_TRANSCRIPT, "actually, where is the nearest bathroom"]);
  });

  test("a pending synthesis is invalidated by a typed question and cannot later speak", async () => {
    await mountApp();
    await openTohiTab();

    let releasePending;
    synthesizeSpeechAudio.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releasePending = () => resolve({ size: 2048, type: "audio/mpeg" });
        })
    );

    // Voice turn commits its text, but synthesis is still in flight.
    await completeVoiceTurn();
    expect(createdUrls).toHaveLength(0);

    // A typed question arrives and must invalidate that pending synthesis.
    await typeAndSend("never mind, when does the park close");
    expect(userMessages()).toEqual([DEFAULT_TRANSCRIPT, "never mind, when does the park close"]);

    // The stale synthesis finally resolves.
    await act(async () => releasePending());
    await flush();

    // It created no URL, played nothing, and left speech idle.
    expect(createdUrls).toHaveLength(0);
    expect(audioElements).toHaveLength(0);
    expect(playbackButton()).toBeNull();
    expect(container.textContent).not.toContain(SPEECH_COPY.speaking);
  });

  test("a REJECTED submission does not interrupt speech", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();

    expect(audioElements[0].paused).toBe(false);

    // Blank input is rejected before the stop, so TOHI keeps reading.
    await act(async () => {
      Array.from(container.querySelectorAll('button[type="submit"]'))
        .find((b) => (b.textContent || "").includes("Send"))
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(audioElements[0].pauseCalls).toBe(0);
    expect(revokedUrls).toEqual([]);
  });
});

describe("3. audio handlers are detached on every teardown path", () => {
  const expectDetached = () => {
    expect(audioElements[0].handlersDetached).toBe(true);
  };

  test("after Stop", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();
    expect(audioElements[0].onended).toEqual(expect.any(Function));

    await click(playbackButton());
    expectDetached();
  });

  test("after leaving the TOHI tab", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();
    await leaveTohiTab();
    expectDetached();
  });

  test("after page hide", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();
    await act(async () => window.dispatchEvent(new Event("pagehide")));
    await flush();
    expectDetached();
  });

  test("after unmount", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();
    const audio = audioElements[0];
    await unmountApp();
    expect(audio.onended).toBeNull();
    expect(audio.onerror).toBeNull();
  });

  test("after playback ends naturally", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();

    await act(async () => audioElements[0].onended());
    await flush();

    expectDetached();
    expect(revokedUrls).toEqual([createdUrls[0]]);
  });

  test("after a playback error", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();

    await act(async () => audioElements[0].onerror());
    await flush();

    expectDetached();
    expect(revokedUrls).toEqual([createdUrls[0]]);
    expect(container.textContent).toContain(SPEECH_COPY.failed);
  });

  test("when replaced by a newer reply, the element is rewired exactly once", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();

    transcribeVoiceRecording.mockImplementation(async () => ({ transcript: "and after that" }));
    sendChatMessage.mockImplementation(async () => ({ reply: "Then take a break." }));
    await completeVoiceTurn();

    // Still one element, freshly wired for the newer reply.
    expect(audioElements).toHaveLength(1);
    expect(audioElements[0].onended).toEqual(expect.any(Function));
    expect(audioElements[0].src).toBe(createdUrls[1]);
    expect(revokedUrls).toContain(createdUrls[0]);
  });
});

describe("14. existing push-to-talk and typed chat are unchanged", () => {
  test("the microphone still records, transcribes and submits one entry", async () => {
    await mountApp();
    await openTohiTab();
    await completeVoiceTurn();

    expect(transcribeVoiceRecording).toHaveBeenCalledTimes(1);
    expect(sendChatMessage).toHaveBeenCalledTimes(1);
    expect(userMessages()).toEqual([DEFAULT_TRANSCRIPT]);
    expect(streams[0].tracks.every((t) => t.stopped)).toBe(true);
  });

  test("a voice turn and a typed turn send the same session payload shape", async () => {
    await mountApp();
    await openTohiTab();
    await typeAndSend("how busy is it right now");
    await completeVoiceTurn();

    const [typed, spoken] = sendChatMessage.mock.calls;
    expect(Object.keys(spoken[1]).sort()).toEqual(Object.keys(typed[1]).sort());
    // And the voice turn carried CURRENT context, including the typed history.
    expect(spoken[1].conversationHistory.map((m) => m.content)).toEqual([
      "how busy is it right now",
      DEFAULT_REPLY,
      DEFAULT_TRANSCRIPT,
    ]);
  });

  test("typed chat still works when speech output is unavailable", async () => {
    await unmountApp();
    delete window.Audio;
    await mountApp();
    await openTohiTab();

    expect(repliesToggle()).toBeNull();

    await typeAndSend("still typing fine");
    expect(assistantMessages()).toEqual([DEFAULT_REPLY]);

    window.Audio = FakeAudio;
  });
});
