/**
 * TOHI Voice Phase A2 — REAL App integration.
 *
 * WHAT THIS FILE IS, stated plainly:
 *
 *   This mounts the ACTUAL <App /> into jsdom and drives it through real
 *   clicks and real MediaRecorder events. It is the only evidence in this
 *   phase for claims that source matching cannot establish:
 *
 *     - React closure freshness (a memoized voice callback must not keep the
 *       first render's handleChatSubmit)
 *     - recorder event ORDERING and callbacks queued across a teardown
 *     - the repeated-Stop race
 *     - late permission rejection after the run was abandoned
 *
 *   `../api` is mocked, so no network, no Anthropic call and no OpenAI call
 *   happens and no API key is needed. Everything else — App, handleChatSubmit,
 *   the voice controller, TohiTab — is the real production code.
 */

import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";

// NOTE: Create React App's Jest preset sets `resetMocks: true`, which strips the
// implementation off every jest.fn() before each test. Implementations are
// therefore installed in beforeEach, not in this factory — a factory
// implementation would silently become `() => undefined` by the time a test ran.
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
  };
});

import App from "../App";
import {
  fetchParkData,
  fetchWeather,
  sendChatMessage,
  sendTohiPickReview,
  transcribeVoiceRecording,
} from "../api";

const DEFAULT_REPLY = "Here is a calm next move.";
const DEFAULT_TRANSCRIPT = "where is the parade";

/* -------------------------------------------------------------------------- */
/* A complete stored family profile, so App opens on the main screen with TOHI */
/* available. Verified against the real getFamilyProfileCompletion.            */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Controllable fake microphone stack                                         */
/* -------------------------------------------------------------------------- */

let recorders;
let streams;
let getUserMediaImpl;

class FakeMediaRecorder {
  static isTypeSupported(type) {
    // Android-shaped browser by default.
    return type === "audio/webm" || type === "audio/webm;codecs=opus";
  }

  constructor(stream, options = {}) {
    this.stream = stream;
    this.state = "inactive";
    this.requestedMimeType = options.mimeType || "";
    // What the browser actually negotiated. Overridden per-test to prove the
    // upload uses the ACTUAL type, not the requested one.
    this.mimeType = options.mimeType || "";
    this.ondataavailable = null;
    this.onstop = null;
    this.onerror = null;
    this.stopCalls = 0;
    recorders.push(this);
  }

  start() {
    this.state = "recording";
  }

  stop() {
    this.stopCalls += 1;
    this.state = "inactive";
    // Real MediaRecorder fires onstop asynchronously. Tests fire it explicitly
    // so ordering is deterministic and can be interleaved with other events.
  }

  emitData(bytes) {
    // A REAL Blob, so the production `new Blob(chunks, ...)` produces a real
    // size and type. A plain {size} stub would make the assertion measure the
    // fake rather than the code under test.
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob([new Uint8Array(bytes)]) });
    }
  }

  emitStop() {
    if (this.onstop) this.onstop();
  }

  emitError() {
    if (this.onerror) this.onerror({});
  }

  /**
   * Snapshots the handlers as they are RIGHT NOW.
   *
   * This is what models a browser event that was already queued before
   * teardown ran: the event carries the handler reference it was dispatched
   * with, so detaching `recorder.onstop` afterwards cannot un-queue it. Firing
   * through a snapshot is therefore the only way to exercise the guards INSIDE
   * those callbacks rather than the detachment that happens to precede them.
   */
  captureCallbacks() {
    const { ondataavailable, onstop, onerror } = this;

    return {
      data: (bytes) =>
        ondataavailable && ondataavailable({ data: new Blob([new Uint8Array(bytes)]) }),
      stop: () => onstop && onstop(),
      error: () => onerror && onerror({}),
    };
  }
}

function makeStream(label) {
  const tracks = [
    { kind: "audio", stopped: false, stop() { this.stopped = true; } },
    { kind: "audio", stopped: false, stop() { this.stopped = true; } },
  ];
  const stream = { label, getTracks: () => tracks, tracks };
  streams.push(stream);
  return stream;
}

/* -------------------------------------------------------------------------- */

let container;
let root;

// React 19 requires this for act() outside a test renderer.
global.IS_REACT_ACT_ENVIRONMENT = true;

/**
 * BottomTabs renders through a portal, so the navigation lives on document.body
 * rather than inside the mounted container. Tab buttons are found there.
 */
function tabButton(label) {
  return Array.from(document.querySelectorAll('nav[aria-label="Primary"] button')).find(
    (b) => (b.textContent || "").trim() === label
  );
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
  if (root) {
    await act(async () => {
      root.unmount();
    });
  }
  if (container) container.remove();
  root = null;
  container = null;
}

const byText = (text, selector = "button") =>
  Array.from(container.querySelectorAll(selector)).find((el) =>
    (el.textContent || "").trim().includes(text)
  );

const micButton = () => container.querySelector('[data-tohi-voice="true"]');
const questionInput = () => container.querySelector("#tohi-question");
const sendButton = () =>
  Array.from(container.querySelectorAll('button[type="submit"]')).find((b) =>
    (b.textContent || "").includes("Send")
  );

/** Every rendered YOU bubble's text, in order. */
function userMessages() {
  const log = container.querySelector('[role="log"]');
  if (!log) return [];

  return Array.from(log.children)
    .filter((entry) => (entry.textContent || "").startsWith("YOU"))
    .map((entry) => entry.textContent.replace(/^YOU/, "").trim());
}

function assistantMessages() {
  const log = container.querySelector('[role="log"]');
  if (!log) return [];

  return Array.from(log.children)
    .filter((entry) => (entry.textContent || "").startsWith("TOHI"))
    .map((entry) => entry.textContent.replace(/^TOHI/, "").trim());
}

async function click(el) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
}

/**
 * Drains promise continuations so an async handler that awaits the mocked API
 * has committed its state before assertions run.
 */
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function openTohiTab() {
  const tab = tabButton("TOHI");
  expect(tab).toBeTruthy();
  await click(tab);
  expect(questionInput()).toBeTruthy();
}

async function leaveTohiTab() {
  const home = tabButton("Home");
  expect(home).toBeTruthy();
  await click(home);
}

async function typeAndSend(text) {
  const input = questionInput();

  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
    setter.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await act(async () => {
    sendButton().dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();
}

/** Start → data → Stop → onstop → transcript submitted. */
async function completeVoiceTurn({ bytes = 4096 } = {}) {
  await click(micButton());
  const recorder = recorders[recorders.length - 1];
  recorder.emitData(bytes);

  await click(micButton()); // Stop

  await act(async () => {
    recorder.emitStop();
  });
  await flush();

  return recorder;
}

beforeEach(() => {
  recorders = [];
  streams = [];
  getUserMediaImpl = jest.fn(async () => makeStream(`stream-${streams.length}`));

  localStorage.clear();
  localStorage.setItem("parkplan.familyProfile", JSON.stringify(COMPLETE_PROFILE));

  window.MediaRecorder = FakeMediaRecorder;
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: (...args) => getUserMediaImpl(...args) },
  });

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
  transcribeVoiceRecording.mockImplementation(async () => ({
    transcript: DEFAULT_TRANSCRIPT,
  }));
});

afterEach(async () => {
  await unmountApp();
  jest.useRealTimers();
  delete global.fetch;
});

/* ========================================================================== */

describe("real App — voice turn uses the CURRENT chat and session context", () => {
  test("a typed turn then a voice turn: history is preserved and context is fresh", async () => {
    await mountApp();
    await openTohiTab();

    /* 1. a complete typed turn */
    await typeAndSend("how busy is it right now");

    expect(sendChatMessage).toHaveBeenCalledTimes(1);
    const typedCall = sendChatMessage.mock.calls[0];
    expect(typedCall[0]).toBe("how busy is it right now");

    expect(userMessages()).toEqual(["how busy is it right now"]);
    expect(assistantMessages()).toEqual([DEFAULT_REPLY]);

    /* 2. then a complete voice turn */
    await completeVoiceTurn();

    expect(transcribeVoiceRecording).toHaveBeenCalledTimes(1);
    expect(sendChatMessage).toHaveBeenCalledTimes(2);

    const voiceCall = sendChatMessage.mock.calls[1];
    expect(voiceCall[0]).toBe("where is the parade");

    /* 3. the typed conversation is still present */
    /* 4. exactly one new voice-origin user entry was appended */
    expect(userMessages()).toEqual([
      "how busy is it right now",
      "where is the parade",
    ]);
    expect(assistantMessages()).toEqual([DEFAULT_REPLY, DEFAULT_REPLY]);

    /* 5. the AI request carried CURRENT context, not the first render's.
          The decisive field is conversationHistory: a stale handleChatSubmit
          would have closed over the empty initial `chat` and sent a history
          without the typed turn. */
    const history = voiceCall[1].conversationHistory;
    expect(Array.isArray(history)).toBe(true);
    expect(history.map((m) => m.content)).toEqual([
      "how busy is it right now",
      DEFAULT_REPLY,
      "where is the parade",
    ]);

    // And the session payload is otherwise the same shape the typed turn sent.
    expect(Object.keys(voiceCall[1]).sort()).toEqual(Object.keys(typedCall[1]).sort());
    expect(voiceCall[1].activePark).toBe(typedCall[1].activePark);
    expect(voiceCall[1].planningPark).toBe(typedCall[1].planningPark);
    expect(voiceCall[1].familyProfile.adultCount).toBe(2);
    expect(voiceCall[1].familyProfile.isSetupComplete).toBe(true);
  });

  test("6. QUICK CHECK intercepts a voice question exactly as it does a typed one", async () => {
    await mountApp();
    await openTohiTab();

    // An open-ended live-strategy question is intercepted BEFORE the AI call.
    transcribeVoiceRecording.mockImplementation(async () => ({
      transcript: "what should we do next",
    }));

    await completeVoiceTurn();

    // One user entry, a clarifying assistant turn, and NO AI request.
    expect(userMessages()).toEqual(["what should we do next"]);
    expect(sendChatMessage).not.toHaveBeenCalled();

    const quickCheck = container.querySelector('[role="log"]');
    expect(quickCheck.textContent).toContain("QUICK CHECK");

    // The ordinary AI path still works afterwards, through the same handler.
    await typeAndSend("how long is the wait for space mountain");
    expect(sendChatMessage).toHaveBeenCalledTimes(1);
  });

  test("a blank transcript submits nothing and leaves the conversation untouched", async () => {
    await mountApp();
    await openTohiTab();
    await typeAndSend("first question");

    transcribeVoiceRecording.mockImplementation(async () => ({ transcript: "   " }));
    await completeVoiceTurn();

    expect(sendChatMessage).toHaveBeenCalledTimes(1); // the typed one only
    expect(userMessages()).toEqual(["first question"]);
    expect(container.textContent).toContain("I didn’t catch anything");
  });
});

describe("real App — stale recorder callbacks cannot touch a newer run", () => {
  test("queued ondataavailable/onstop/onerror from an abandoned run are inert", async () => {
    await mountApp();
    await openTohiTab();

    /* run 1 */
    await click(micButton());
    const first = recorders[0];
    const firstStream = streams[0];
    first.emitData(1024);

    // Snapshot run 1's handlers BEFORE teardown, so the events fired later are
    // genuinely "already queued" ones that teardown's detachment cannot cancel.
    const queuedFromFirstRun = first.captureCallbacks();

    /* abandon run 1 by leaving TOHI, then come back and start run 2 */
    await leaveTohiTab();

    // Leaving TOHI released run 1's tracks.
    expect(firstStream.tracks.every((t) => t.stopped)).toBe(true);

    await openTohiTab();
    await click(micButton());

    const second = recorders[1];
    const secondStream = streams[1];
    expect(second).not.toBe(first);
    second.emitData(2048);

    /* now fire the OLD run's already-queued callbacks */
    await act(async () => {
      queuedFromFirstRun.data(999999); // must not append into run 2
      queuedFromFirstRun.error(); // must not tear down run 2
      queuedFromFirstRun.stop(); // must not clear chunks, stop tracks, upload or submit
    });
    await flush();

    // Run 2 is untouched: its tracks are live, it is still listening, and
    // nothing was uploaded or submitted by the stale run.
    expect(secondStream.tracks.every((t) => t.stopped)).toBe(false);
    expect(transcribeVoiceRecording).not.toHaveBeenCalled();
    expect(sendChatMessage).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Listening…");

    /* run 2 still completes normally, carrying only its own audio */
    await click(micButton());
    await act(async () => {
      second.emitStop();
    });

    expect(transcribeVoiceRecording).toHaveBeenCalledTimes(1);
    const uploadedBlob = transcribeVoiceRecording.mock.calls[0][0];
    // 2048 only — the stale 999999-byte chunk never entered run 2.
    expect(uploadedBlob.size).toBe(2048);
    expect(userMessages()).toEqual(["where is the parade"]);
    expect(secondStream.tracks.every((t) => t.stopped)).toBe(true);
  });

  test("a late transcription result after leaving TOHI does not submit", async () => {
    await mountApp();
    await openTohiTab();

    let releaseTranscript;
    transcribeVoiceRecording.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseTranscript = () => resolve({ transcript: "too late" });
        })
    );

    await click(micButton());
    const recorder = recorders[0];
    recorder.emitData(1024);
    await click(micButton());
    await act(async () => {
      recorder.emitStop();
    });

    // Upload is in flight. Leave TOHI, then let it resolve.
    await leaveTohiTab();

    await act(async () => {
      releaseTranscript();
    });

    expect(sendChatMessage).not.toHaveBeenCalled();

    await openTohiTab();
    expect(userMessages()).toEqual([]);
    expect(streams[0].tracks.every((t) => t.stopped)).toBe(true);
  });
});

describe("real App — late permission rejection after cancellation", () => {
  test("a rejection arriving after the guest left TOHI is silent and harmless", async () => {
    await mountApp();
    await openTohiTab();

    let rejectPermission;
    getUserMediaImpl = jest.fn(
      () =>
        new Promise((_resolve, reject) => {
          rejectPermission = () => {
            const err = new Error("denied");
            err.name = "NotAllowedError";
            reject(err);
          };
        })
    );

    await click(micButton()); // prompt is open
    expect(container.textContent).toContain("Asking to use the microphone");

    // Guest leaves TOHI while the prompt is still open.
    await leaveTohiTab();

    await act(async () => {
      rejectPermission();
    });

    await openTohiTab();

    // No stale permission notice, nothing submitted, microphone idle again.
    expect(container.textContent).not.toContain("Microphone access is off");
    expect(container.textContent).not.toContain("Asking to use the microphone");
    expect(sendChatMessage).not.toHaveBeenCalled();
    expect(micButton().disabled).toBe(false);
  });

  test("a late rejection does not disturb a newer run", async () => {
    await mountApp();
    await openTohiTab();

    let rejectFirst;
    getUserMediaImpl = jest.fn(
      () =>
        new Promise((_resolve, reject) => {
          rejectFirst = () => {
            const err = new Error("denied");
            err.name = "NotAllowedError";
            reject(err);
          };
        })
    );

    await click(micButton()); // run 1 prompt open

    // Guest leaves and comes back; run 2 gets a working microphone.
    await leaveTohiTab();
    getUserMediaImpl = jest.fn(async () => makeStream("second"));
    await openTohiTab();
    await click(micButton());

    expect(container.textContent).toContain("Listening…");

    // Run 1's rejection finally lands.
    await act(async () => {
      rejectFirst();
    });

    // Run 2 is still listening; no permission notice appeared.
    expect(container.textContent).toContain("Listening…");
    expect(container.textContent).not.toContain("Microphone access is off");
  });

  test("an ordinary permission denial still leaves typed chat fully usable", async () => {
    await mountApp();
    await openTohiTab();

    getUserMediaImpl = jest.fn(async () => {
      const err = new Error("denied");
      err.name = "NotAllowedError";
      throw err;
    });

    await click(micButton());

    expect(container.textContent).toContain("Microphone access is off");

    await typeAndSend("typed still works");
    expect(sendChatMessage).toHaveBeenCalledTimes(1);
    expect(userMessages()).toEqual(["typed still works"]);
  });
});

describe("real App — repeated Stop is exactly one upload", () => {
  test("two rapid Stop taps before onstop produce one upload and one chat turn", async () => {
    await mountApp();
    await openTohiTab();

    await click(micButton());
    const recorder = recorders[0];
    recorder.emitData(3072);

    // Two Stop taps land before the queued onstop event fires.
    await click(micButton());
    await click(micButton());

    expect(recorder.stopCalls).toBe(1);

    // The queued onstop finally arrives.
    await act(async () => {
      recorder.emitStop();
    });

    expect(transcribeVoiceRecording).toHaveBeenCalledTimes(1);
    expect(sendChatMessage).toHaveBeenCalledTimes(1);
    expect(userMessages()).toEqual(["where is the parade"]);
    expect(recorders).toHaveLength(1); // no second recorder was created
  });

  test("a duplicated onstop event still produces exactly one upload", async () => {
    await mountApp();
    await openTohiTab();

    await click(micButton());
    const recorder = recorders[0];
    recorder.emitData(3072);
    await click(micButton());

    await act(async () => {
      recorder.emitStop();
      recorder.emitStop();
    });

    expect(transcribeVoiceRecording).toHaveBeenCalledTimes(1);
    expect(userMessages()).toEqual(["where is the parade"]);
  });

  test("rapid start taps create exactly one recorder", async () => {
    await mountApp();
    await openTohiTab();

    const mic = micButton();
    await act(async () => {
      mic.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      mic.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      mic.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(recorders).toHaveLength(1);
    expect(streams).toHaveLength(1);
  });
});

describe("real App — the upload uses the ACTUAL recorder MIME type", () => {
  test("when negotiated and requested types differ, the negotiated one is sent", async () => {
    await mountApp();
    await openTohiTab();

    await click(micButton());
    const recorder = recorders[0];

    // Requested webm/opus; the browser actually produced plain mp4.
    expect(recorder.requestedMimeType).toBe("audio/webm;codecs=opus");
    recorder.mimeType = "audio/mp4";
    recorder.emitData(2048);

    await click(micButton());
    await act(async () => {
      recorder.emitStop();
    });

    expect(transcribeVoiceRecording).toHaveBeenCalledTimes(1);
    const [blob, contentType] = transcribeVoiceRecording.mock.calls[0];
    expect(contentType).toBe("audio/mp4");
    expect(blob.type).toBe("audio/mp4");
  });

  test("an unsupported actual recorder type is refused, not relabelled as the requested one", async () => {
    await mountApp();
    await openTohiTab();

    await click(micButton());
    const recorder = recorders[0];
    const stream = streams[0];

    // Requested WebM, but the browser actually produced Opus-in-Ogg — a format
    // the transcription endpoint does not document. Relabelling those bytes as
    // WebM would upload them under a content type that does not describe them.
    expect(recorder.requestedMimeType).toBe("audio/webm;codecs=opus");
    recorder.mimeType = "audio/ogg;codecs=opus";
    recorder.emitData(2048);

    await click(micButton());
    await act(async () => {
      recorder.emitStop();
    });
    await flush();

    // Nothing was uploaded and nothing was submitted.
    expect(transcribeVoiceRecording).not.toHaveBeenCalled();
    expect(sendChatMessage).not.toHaveBeenCalled();
    expect(userMessages()).toEqual([]);

    // The microphone was released anyway.
    expect(stream.tracks.every((t) => t.stopped)).toBe(true);

    // Calm, provider-free copy, and the control is usable again.
    expect(container.textContent).toContain(
      "Voice isn’t available right now. You can still type your question."
    );
    expect(container.textContent.toLowerCase()).not.toMatch(/ogg|webm|mime|codec/);
    expect(micButton().disabled).toBe(false);

    // Typed chat is completely unaffected.
    await typeAndSend("typed still works after that");
    expect(sendChatMessage).toHaveBeenCalledTimes(1);
    expect(userMessages()).toEqual(["typed still works after that"]);
  });

  test("a blank recorder type falls back to the requested one", async () => {
    await mountApp();
    await openTohiTab();

    await click(micButton());
    const recorder = recorders[0];
    recorder.mimeType = "";
    recorder.emitData(2048);

    await click(micButton());
    await act(async () => {
      recorder.emitStop();
    });

    expect(transcribeVoiceRecording.mock.calls[0][1]).toBe("audio/webm;codecs=opus");
  });
});

describe("real App — the microphone is visibly unavailable while TOHI is answering", () => {
  test("the mic is disabled during a chat turn and enabled again afterwards", async () => {
    await mountApp();
    await openTohiTab();

    let releaseReply;
    sendChatMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseReply = () => resolve({ reply: "Answer." });
        })
    );

    expect(micButton().disabled).toBe(false);

    await typeAndSend("a slow question");

    // Chat is in flight: the microphone must LOOK unavailable, not silently
    // swallow the tap. aria-busy stays false — the mic itself is not busy.
    expect(micButton().disabled).toBe(true);
    expect(micButton().getAttribute("aria-busy")).toBe("false");
    expect(micButton().getAttribute("aria-label")).toBe("Ask by voice");

    // Tapping it while disabled starts nothing.
    await click(micButton());
    expect(recorders).toHaveLength(0);

    await act(async () => {
      releaseReply();
    });

    expect(micButton().disabled).toBe(false);
  });

  test("the 30-second ceiling stops the recording through the same single path", async () => {
    jest.useFakeTimers();
    await mountApp();
    await openTohiTab();

    await click(micButton());
    const recorder = recorders[0];
    recorder.emitData(1024);

    expect(container.textContent).toContain("Listening…");

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });

    expect(recorder.stopCalls).toBe(1);
    expect(container.textContent).toContain("Getting your question");

    jest.useRealTimers();

    await act(async () => {
      recorder.emitStop();
    });

    expect(transcribeVoiceRecording).toHaveBeenCalledTimes(1);
    expect(userMessages()).toEqual(["where is the parade"]);
  });
});
