/**
 * TOHI Voice — spoken reply helpers (Phase A3).
 *
 * Speech is an OUTPUT layer over text TOHI has already decided to say. Nothing
 * here reasons or reaches the chat path. The visible text is always
 * authoritative; audio may use a shorter, speech-friendly rendering of those
 * same facts and may silently fail.
 *
 * WHAT THIS DELIBERATELY IS NOT:
 *   - No `speechSynthesis`. The browser's built-in voice is not used, not even
 *     as a hidden fallback: it sounds nothing like TOHI, varies by device, and
 *     would make the spoken voice unpredictable.
 *   - No Realtime API, no WebSocket, no streaming session, no always-listening
 *     behaviour. One bounded request produces one bounded audio file.
 *
 * Everything is deterministic and free of browser globals — capabilities are
 * passed in — so the tests and harness can execute this real production logic
 * without audio hardware, a network, or a DOM.
 */

/** Matches the backend ceiling exactly. Never raise one without the other. */
export const MAX_SPEECH_CHARS = 600;

/** Matches the backend output ceiling exactly. */
export const MAX_SPEECH_BYTES = 2 * 1024 * 1024;

/** The one format requested and expected. iPhone Safari plays MP3 reliably. */
export const SPEECH_CONTENT_TYPE = "audio/mpeg";

/** Bounded, provider-free failure categories. These reach the UI; nothing else does. */
export const SPEECH_ERRORS = Object.freeze({
  EMPTY_TEXT: "empty_text",
  TEXT_TOO_LONG: "text_too_long",
  RATE_LIMITED: "rate_limited",
  UNAVAILABLE: "speech_unavailable",
  BLOCKED: "autoplay_blocked",
});

/**
 * Calm copy for every spoken-reply state.
 *
 * No provider is named anywhere. The disclosure states plainly that the voice
 * is AI-generated, in TOHI's own register rather than as a legal notice, and
 * avoids every word CLAUDE.md bans from user-facing copy.
 */
export const SPEECH_COPY = Object.freeze({
  speaking: "TOHI is reading this out loud.",
  stop: "Stop",
  play: "Play TOHI reply",
  blocked: "Tap to hear this reply.",
  failed: "Couldn’t read that out loud. The answer is here as text.",
  toggleOn: "Voice replies on",
  toggleOff: "Voice replies off",
  toggleLabel: "Voice replies",
  disclosure: "TOHI’s speaking voice is AI-generated.",
});

/** Added only when a longer ordinary reply is shortened for speech. */
export const SPOKEN_DETAIL_NOTE = "I’ve put the rest of the details on your screen.";

/** Keeps ordinary spoken replies useful without turning them into a readout. */
const SPOKEN_SUMMARY_TARGET_CHARS = 180;

/**
 * Weather and safety guidance stays complete. These replies may contain a
 * second instruction whose importance cannot be inferred from sentence order.
 */
/**
 * Terms that mean weather or safety guidance wherever they appear. Broad on
 * purpose: over-matching here only costs a reply its shortening, while
 * under-matching could drop an instruction that keeps a family safe.
 */
const STRONG_WEATHER_OR_SAFETY =
  /(?:\b(?:weather|rain|raining|rainy|pour|pouring|downpour|poncho|storm|storms|thunderstorm|lightning|heat|heat index|temperature|humidity|hydrate|hydration|shade|shady|sunscreen|sunburn|sun|cool down|cool off|AC|shelter|sheltered|severe|overheat(?:ed|ing)?|medical|emergency|first aid|feels like)\b|\b\d{1,3}\s*°\s*F\b|\b911\b)/i;

/**
 * Low-signal words that only mean guidance in an instructional context.
 *
 * "fully indoor" and "a water ride" describe an attraction; "head indoors" and
 * "keep sipping water" tell a family what to do. Matching the bare words made
 * ordinary recommendations bypass shortening entirely, which defeats the whole
 * feature, so these require an adjacent instruction.
 */
const CONTEXTUAL_WEATHER_OR_SAFETY = new RegExp(
  [
    // "head indoors", "move back inside", "stay indoors"
    "\\b(?:head|move|get|stay|go|duck|step|wait)\\s+(?:back\\s+)?(?:indoors?|inside)\\b",
    // "pick the nearest indoor show", "find an indoor reset"
    "\\b(?:nearest|find|pick|choose|favor|favour|prefer)\\s+(?:an?\\s+|the\\s+)?(?:nearest\\s+)?indoors?\\b",
    // "use water", "keep sipping water", "refill water"
    "\\b(?:use|drink|drinking|sip|sipping|refill|grab|carry)\\s+(?:more\\s+|some\\s+|the\\s+)?water\\b",
    // "water, AC, food" — the production heat-reset phrasing
    "\\bwater\\s*,\\s*AC\\b",
    // "keep everyone drinking"
    "\\bkeep\\s+\\S+(?:\\s+\\S+)?\\s+drinking\\b",
  ].join("|"),
  "i"
);

/**
 * Whether a reply is weather or safety guidance, and must therefore be spoken
 * complete rather than summarized.
 *
 * MUST be evaluated on the cleaned but PRE-naturalized text. Naturalizing turns
 * "97°F" into "ninety-seven degrees Fahrenheit", which the degree pattern can
 * no longer see — deciding afterwards silently dropped the safety instructions
 * that followed a temperature-only warning.
 */
export function isWeatherOrSafetyGuidance(text) {
  if (typeof text !== "string" || !text) return false;

  return STRONG_WEATHER_OR_SAFETY.test(text) || CONTEXTUAL_WEATHER_OR_SAFETY.test(text);
}

const SMALL_NUMBERS = Object.freeze([
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
]);

const TENS = Object.freeze([
  "", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
]);

/** Natural words for the bounded park values this layer rewrites. */
function numberToSpeech(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 999) return String(value);
  if (number < 20) return SMALL_NUMBERS[number];
  if (number < 100) {
    const ones = number % 10;
    return `${TENS[Math.floor(number / 10)]}${ones ? `-${SMALL_NUMBERS[ones]}` : ""}`;
  }

  const remainder = number % 100;
  return `${SMALL_NUMBERS[Math.floor(number / 100)]} hundred${
    remainder ? ` ${numberToSpeech(remainder)}` : ""
  }`;
}

/**
 * Time of day as words, deliberately WITHOUT "A.M."/"P.M.".
 *
 * Those abbreviations end in a period, and the sentence scanner cannot tell
 * that period from a real sentence ending — "Meet at 9 AM near Spaceship Earth"
 * became "Meet at nine A.M." and the meeting place was dropped from speech.
 * A spoken phrase carries the same meaning with no ambiguous punctuation at
 * all, so a genuine sentence ending after a time still reads correctly.
 */
function timeOfDayPhrase(hour, period) {
  if (period === "A.M.") return "in the morning";
  if (hour === 12 || hour <= 5) return "in the afternoon";

  return "in the evening";
}

function clockTimeToSpeech(hourValue, minuteValue, periodValue) {
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const period = String(periodValue).toLowerCase() === "a" ? "A.M." : "P.M.";

  if (hour === 12 && minute === 0) return period === "A.M." ? "midnight" : "noon";

  const spokenHour = numberToSpeech(hour % 12 || 12);
  const phrase = timeOfDayPhrase(hour % 12 || 12, period);

  if (minute === 0) return `${spokenHour} ${phrase}`;
  if (minute < 10) return `${spokenHour} oh ${numberToSpeech(minute)} ${phrase}`;

  return `${spokenHour} ${numberToSpeech(minute)} ${phrase}`;
}

/**
 * Visual labels TOHI renders as headings above a block.
 *
 * Matched ONLY at the start of a line and only when the label is either
 * standalone or followed by heading punctuation. That structural requirement is
 * what stops ordinary prose being gutted: "the best move is Big Thunder" keeps
 * every word, because "best move" there is neither line-initial nor followed by
 * a separator. Case-insensitive on purpose — TOHI can render these as
 * "BEST MOVE:" or "Best Move —" and both are headings.
 */
const VISUAL_LABEL_LINE = /^[ \t]*(?:TOHI PICK|BEST MOVE|SMART BACKUP|WHY THIS WORKS|RECOMMENDATIONS?)[ \t]*(?:[·:—–-]+[ \t]*|(?=$))/gim;

/** Strips chained labels such as "TOHI PICK · BEST MOVE" on one heading line. */
function stripVisualLabels(text) {
  let current = text;

  // Bounded: a heading line carries at most a handful of chained labels.
  for (let pass = 0; pass < 4; pass += 1) {
    const next = current.replace(VISUAL_LABEL_LINE, "");
    if (next === current) return current;
    current = next;
  }

  return current;
}

/**
 * Sentence terminators that belong to an abbreviation, not to a sentence end.
 * Lower-cased for comparison.
 */
const SENTENCE_ABBREVIATIONS = Object.freeze([
  "mr", "mrs", "ms", "dr", "st", "mt", "jr", "sr", "vs", "approx", "etc",
]);

/**
 * Removes presentation-only syntax without touching the visible response.
 * Newlines become sentence pauses before whitespace is collapsed so headings
 * and list items do not run together in audio.
 */
function removeVisualFormatting(text) {
  // Line structure is preserved until the label pass has run, because a visual
  // label is only identifiable by WHERE it sits. Newlines become sentence
  // pauses afterwards so headings and list items do not run together in audio.
  const withoutDecoration = text
    .replace(/\r\n?/g, "\n")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/[✅☑➡→✨📍🎢\uFE0F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+$/gm, "")
    .replace(/^[ \t]+/gm, "");

  return stripVisualLabels(withoutDecoration)
    .replace(/\s*&\s*/g, " and ")
    .replace(/\n+/g, ". ")
    .replace(/^[\s.,;:]+/, "")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits into sentences, keeping punctuation attached so selected sentences
 * retain natural pauses.
 *
 * A deterministic scanner rather than one regex, for two reasons the regex got
 * wrong: a decimal point between digits is not a sentence end ("1.5 miles"
 * must never become "5 miles"), and a period after a common abbreviation is not
 * one either ("Mr. Toad's Wild Ride" must stay one sentence). A scanner also
 * cannot silently drop text the way a failed regex match did — every character
 * between `start` and the end is always emitted.
 */
function splitSpeechSentences(text) {
  const sentences = [];
  let start = 0;

  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    if (character !== "." && character !== "!" && character !== "?") continue;

    // Consume a run such as "?!" or "..." so it stays with its sentence.
    let end = i;
    while (end + 1 < text.length && ".!?".includes(text[end + 1])) end += 1;

    const following = text[end + 1];

    // A terminator must be followed by whitespace or the end of the reply.
    if (following !== undefined && !/\s/.test(following)) {
      i = end;
      continue;
    }

    if (character === ".") {
      // "1.5" — a decimal point sits between digits and ends nothing.
      if (/\d/.test(text[i - 1] || "") && /\d/.test(text[i + 1] || "")) {
        i = end;
        continue;
      }

      // "Mr." / "Mt." — an abbreviation's period ends nothing either.
      const trailingWord = (text.slice(start, i).match(/([A-Za-z]+)$/) || [])[1];
      if (trailingWord && SENTENCE_ABBREVIATIONS.includes(trailingWord.toLowerCase())) {
        i = end;
        continue;
      }
    }

    const sentence = text.slice(start, end + 1).trim();
    if (sentence) sentences.push(sentence);
    start = end + 1;
  }

  const remainder = text.slice(start).trim();
  if (remainder) sentences.push(remainder);

  return sentences;
}

/**
 * Keeps the first actionable sentence and, when it fits, one supporting
 * sentence. Weather/safety replies are deliberately excluded from shortening.
 */
function shortenOrdinaryReply(text, isGuidance) {
  // The decision arrives from the caller, made on the pre-naturalized text.
  if (isGuidance) return text;

  const sentences = splitSpeechSentences(text);
  if (sentences.length <= 2 && text.length <= SPOKEN_SUMMARY_TARGET_CHARS) return text;

  const noteBudget = SPOKEN_DETAIL_NOTE.length + 1;
  const maximumSummaryLength = MAX_SPEECH_CHARS - noteBudget;
  const first = sentences[0];

  if (!first || first.length > maximumSummaryLength) return text;

  const selected = [first];
  const second = sentences[1];
  if (
    second &&
    `${first} ${second}`.length <= SPOKEN_SUMMARY_TARGET_CHARS &&
    `${first} ${second}`.length <= maximumSummaryLength
  ) {
    selected.push(second);
  }

  const summary = selected.join(" ");
  if (summary === text || selected.length === sentences.length) return text;

  const prepared = `${summary} ${SPOKEN_DETAIL_NOTE}`;
  return prepared.length < text.length ? prepared : text;
}

/**
 * Nouns a duration modifies when it sits directly in front of one.
 *
 * English makes an attributive duration singular — "a ten minute wait", never
 * "a ten minutes wait" — while a standalone duration stays plural: "the wait is
 * ten minutes". A short, explicit list of the nouns TOHI actually uses is safer
 * and easier to read than trying to detect nouns generally, and anything not on
 * it simply keeps the existing plural behaviour.
 */
const ATTRIBUTIVE_DURATION_NOUNS =
  "wait|walk|ride|queue|line|break|show|stroll|window|gap|buffer|hike|trip|drive|rest|nap|delay|detour|loop";

/** Matches a duration only when the next word is one of those nouns. */
const ATTRIBUTIVE_DURATION_AHEAD = `(?=\\s+(?:${ATTRIBUTIVE_DURATION_NOUNS})\\b)`;

/** Speech-only pronunciation, time, temperature and wait formatting. */
function makeSpeechNatural(text) {
  return text
    .replace(/\b(1[0-2]|0?[1-9]):([0-5]\d)\s*([ap])\.?m\.?\b/gi, (_, hour, minute, period) =>
      clockTimeToSpeech(hour, minute, period)
    )
    .replace(/\b(1[0-2]|0?[1-9])\s*([ap])\.?m\.?\b/gi, (_, hour, period) =>
      clockTimeToSpeech(hour, "00", period)
    )
    // Attributive range first: "a 5-10 min wait" -> "a five to ten minute wait".
    .replace(
      new RegExp(
        `\\b(\\d{1,3})\\s*[-–—]\\s*(\\d{1,3})\\s*(?:mins?|minutes?)${ATTRIBUTIVE_DURATION_AHEAD}`,
        "gi"
      ),
      (_, from, to) => `${numberToSpeech(from)} to ${numberToSpeech(to)} minute`
    )
    // Standalone range: "between 5-10 min" -> "between five to ten minutes".
    .replace(/\b(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*(?:mins?|minutes?)\b/gi, (_, from, to) =>
      `${numberToSpeech(from)} to ${numberToSpeech(to)} minutes`
    )
    // Hyphenated form is always attributive: "a 25-minute wait".
    .replace(/\b(\d{1,3})[-‑–—]minute\b/gi, (_, value) => `${numberToSpeech(value)} minute`)
    // Attributive single value: "a 10 min wait" -> "a ten minute wait".
    .replace(
      new RegExp(`\\b(\\d{1,3})\\s*(?:mins?|minutes?)${ATTRIBUTIVE_DURATION_AHEAD}`, "gi"),
      (_, value) => `${numberToSpeech(value)} minute`
    )
    // Standalone single value: "the wait is 10 min" -> "ten minutes".
    .replace(/\b(\d{1,3})\s*(?:mins?|minutes?)\b/gi, (_, value) =>
      `${numberToSpeech(value)} ${Number(value) === 1 ? "minute" : "minutes"}`
    )
    .replace(/\b(\d{1,3})\s*°\s*F\b/gi, (_, value) =>
      `${numberToSpeech(value)} degrees Fahrenheit`
    )
    .replace(/\b(\d{1,3})\s*%/g, (_, value) => `${numberToSpeech(value)} percent`)
    .replace(/\bEPCOT\b/g, "Epcot")
    .replace(/\bTRON\b/g, "Tron")
    .replace(/\bNa[’']vi\b/gi, "Nah-vee")
    .replace(/\s+[—–]\s+/g, ", ")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Last-resort ceiling. Guarantees the prepared string fits the provider limit.
 *
 * Runs on the FINAL speech-ready text, after numbers have been expanded, so the
 * budget is measured against what is actually sent. Whole sentences are kept
 * wherever possible; only a single sentence longer than the whole budget is cut,
 * and then at a word boundary rather than mid-number.
 *
 * This also applies to weather and safety guidance. Above the ceiling the
 * provider would refuse the request outright, so a bounded spoken summary plus
 * the on-screen note is strictly better than silence — and the complete
 * guidance is still on screen, where it remains authoritative.
 */
function enforceSpeechCeiling(text) {
  if (text.length <= MAX_SPEECH_CHARS) return text;

  const budget = MAX_SPEECH_CHARS - (SPOKEN_DETAIL_NOTE.length + 1);
  const sentences = splitSpeechSentences(text);
  const kept = [];
  let used = 0;

  for (const sentence of sentences) {
    const cost = kept.length ? sentence.length + 1 : sentence.length;
    if (used + cost > budget) break;
    kept.push(sentence);
    used += cost;
  }

  if (!kept.length) {
    const clipped = text.slice(0, budget);
    const lastSpace = clipped.lastIndexOf(" ");
    kept.push((lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trim());
  }

  return `${kept.join(" ")} ${SPOKEN_DETAIL_NOTE}`;
}

/**
 * Creates the speech-only rendering of an already-committed TOHI response.
 * The function is pure and deterministic. Any unexpected preparation failure
 * returns the original normalized reply so audio can never replace its facts.
 */
export function prepareSpokenReply(text) {
  const original = normalizeSpeechText(text);
  if (!original) return null;

  try {
    const withoutVisualFormatting = removeVisualFormatting(text);
    if (!withoutVisualFormatting) return original;

    // Numbers are expanded BEFORE any length decision. "25 min" becomes
    // "twenty-five minutes", so budgeting against the pre-expansion string
    // would let a reply that fits become one that the provider refuses — and
    // the guest would lose audio with no explanation.
    // Decided BEFORE naturalizing, while "97°F" is still recognizable.
    const isGuidance = isWeatherOrSafetyGuidance(withoutVisualFormatting);

    const naturalSpeech = makeSpeechNatural(withoutVisualFormatting);
    const shortened = shortenOrdinaryReply(naturalSpeech, isGuidance);
    const bounded = enforceSpeechCeiling(shortened);

    return normalizeSpeechText(bounded) || original;
  } catch {
    return original;
  }
}

/**
 * Reduces already-prepared speech text to the exact string sent, or null.
 *
 * Whitespace is collapsed so a multi-line reply is not read with long dead air.
 * Speech-only rewriting lives in prepareSpokenReply; validation remains a
 * separate final boundary.
 */
export function normalizeSpeechText(text) {
  if (typeof text !== "string") return null;

  const normalized = text.replace(/\s+/g, " ").trim();

  return normalized || null;
}

/**
 * Decides whether a reply is worth sending for synthesis.
 *
 * Enforced on the client so an empty or over-long reply never becomes a
 * request. The server enforces the same bounds independently — this is the
 * cheap half of a two-sided guard, not the only one.
 */
export function validateSpeechText(text) {
  const normalized = normalizeSpeechText(text);

  if (!normalized) return { ok: false, reason: SPEECH_ERRORS.EMPTY_TEXT };

  if (normalized.length > MAX_SPEECH_CHARS) {
    return { ok: false, reason: SPEECH_ERRORS.TEXT_TOO_LONG };
  }

  return { ok: true, text: normalized };
}

/**
 * Reduces a Content-Type to its bare media type, lowercased, or null.
 *
 * Parameters and casing are both legitimate — `Audio/MPEG; charset=binary` is
 * the same type as `audio/mpeg` — so only the media type decides.
 */
export function normalizeAudioContentType(value) {
  if (typeof value !== "string") return null;

  const mediaType = value.split(";")[0].trim().toLowerCase();

  return mediaType || null;
}

/** True only for the one format this phase requests and expects. */
export function isMpegAudioContentType(value) {
  return normalizeAudioContentType(value) === SPEECH_CONTENT_TYPE;
}

/**
 * Rejects an audio payload that is empty, past the ceiling, or not MP3.
 *
 * The MIME check is defense in depth: the response header has already been
 * validated by the caller. A BLANK blob type is accepted deliberately — some
 * browsers hand back an empty type even for a correctly labelled response, and
 * rejecting those would break real playback for no safety gain. A blob that
 * states a type must state the right one.
 */
export function validateSpeechBlob(blob) {
  const size = blob && typeof blob.size === "number" ? blob.size : 0;

  if (!blob || size <= 0) return { ok: false, reason: SPEECH_ERRORS.UNAVAILABLE };
  if (size > MAX_SPEECH_BYTES) return { ok: false, reason: SPEECH_ERRORS.UNAVAILABLE };

  const declared = typeof blob.type === "string" ? blob.type.trim() : "";
  if (declared && !isMpegAudioContentType(declared)) {
    return { ok: false, reason: SPEECH_ERRORS.UNAVAILABLE };
  }

  return { ok: true, size };
}

/**
 * True only when this browser can play an object-URL audio file.
 *
 * `Audio` and `createObjectURL` are passed in rather than read off globals so
 * both the supported and unsupported shapes can be exercised in one test run.
 * When this is false the microphone still works and the reply is still shown —
 * voice output simply never appears.
 */
export function isSpeechOutputSupported({ AudioCtor, createObjectURL } = {}) {
  return typeof AudioCtor === "function" && typeof createObjectURL === "function";
}

/**
 * Normalizes what `HTMLMediaElement.play()` returns into a promise.
 *
 * Older browsers — and jsdom — return undefined rather than a promise, so a
 * bare `.catch()` on the result would throw and be mistaken for a playback
 * rejection. Treating undefined as "started" is correct: those environments do
 * not report autoplay blocking at all.
 */
export function playbackResultToPromise(result) {
  if (result && typeof result.then === "function") return result;

  return Promise.resolve();
}
