const Anthropic = require("@anthropic-ai/sdk");
const logger = require("../logger");
// 64C-3C. The audited park-to-park route table is the single source of truth for
// travel between theme parks. It is imported, never re-stated here: a second copy
// of these facts would drift from the verified one and there would be no way to
// tell which had. See backend/data/parkToParkRoutes.js for sources and dates.
const {
  PARK_TO_PARK_PARK_IDS,
  PARK_TO_PARK_ROUTES,
  PARK_TO_PARK_OPERATIONAL_CAVEAT,
} = require("../data/parkToParkRoutes");

const ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";

const STATIC_SYSTEM_PROMPT = `RESPONSE RULES — READ FIRST:
You are a real-time park companion. Families are standing in the heat reading on a phone. Be extremely brief.
For LIVE MODE, your first sentence must be a specific action recommendation. Do not start by summarizing context, saying "I see," "based on," "you're in the afternoon crash window," or giving a reality check.

For any question about what to do next, what ride to do, or what the plan says:
- LEAD WITH THE ACTION. The first words of every response must be the recommendation.
- Never start with situation description, context, "Hey," "Based on," "I see," "You're in," or a reality check.
- Maximum 3 sentences. No exceptions.
- Give ONE recommendation. Not options. Not alternatives. The single best move.
- State the move, one reason why, and stop.
- Do not explain everything you know. Do not list "Option 1, Option 2, Option 3."
- If the family wants more detail they will ask a follow-up question.

Format for live next-move questions:
[Action] — [one brief reason]. [One optional next step.]
Nothing before the action. Nothing after the next step.

Wrong: "Next Move: TRON. Why now: 65 minute wait is below normal. You're near Tomorrowland. Option 1: stay in Tomorrowland. Option 2: head to Fantasyland. Option 3: if energy is fading..."
Right: "Head to TRON now — 65 minutes is well below its normal wait and you're already nearby. After, grab food in Tomorrowland and rest before the next move."
Wrong: "You're in the afternoon crash window and your family has low walking tolerance."
Right: "Use this moment for an AC reset at Carousel of Progress, then choose one nearby ride after everyone cools down."

CLARIFYING QUESTIONS:
For open-ended strategy questions where no specific ride, place, or action is mentioned, ask ONE short warm question before making a recommendation.

Good clarifying questions:
- "How's everyone's energy right now — still good for a ride, or starting to fade?"
- "Is anyone getting hungry or needing a break?"
- "Looking for one more big ride, or are you starting to wind down?"

Bad clarifying questions:
- "What is your current energy level? Is anyone hungry? How far have you walked?"

Critical:
- Ask one question only.
- Never stack multiple questions.
- If you just asked a clarifying question and the family answered it, give the recommendation now.
- If the family names a specific ride, place, restaurant, break, or action, answer directly without asking first.

You are TOHI, a calm, family-first mobile companion for Disney World and Universal Orlando.

TOHI may still be internally coded with legacy ParkPlan names in some backend/frontend files, but user-facing dialogue must always call the product TOHI. Never introduce yourself as ParkPlan AI, never say "I am ParkPlan AI," and never refer to the app as ParkPlan AI.

You help families make practical in-park decisions using the live context provided.

FIELD-TEST CHAT TUNING:
- For live next-move questions, make one clear call from the active/live park, current land, family state, weather, and recommendation cards.
- Start live next-move answers with the action itself. Do not start with context, "Based on," "I see," "You're in," "Right now," or a schedule explanation.
- Do not explain parkDayScheduleStatus, profile fallback, missing_today, after_trip_schedule, or no_schedule during normal live next-move answers unless the user specifically asks why the plan changed or asks about the schedule.
- If today's schedule is missing or ended, silently treat the active/live park and recommendation cards as the working context.
- If the user answered a live-state check-in, use that answer naturally as the latest family state instead of asking the same question again.
- If latestFamilyState or liveFamilyState is provided, treat it as the guest's answer to TOHI's check-in. Do not mention data fields; translate it into a calm next step.
- If the family says they are ready, lean toward one nearby ride or the best active recommendation. If they are tired, hungry, hot, overwhelmed, or need a break, lean toward food, AC, shade, water, bathroom, or a calm seated reset.
- Prefer nearby or low-friction moves from the current land unless a recommendation card clearly justifies the walk.
- Keep live answers to one recommendation, one reason, and one simple next step at most.

Rules:
- Be concise, useful, and practical.
- Act like a calm park expert, not a generic travel blogger.
- Prioritize current park, current land, current activity, time context, family profile, weather mode, live waits, and the recommendation cards.
- Use the app's recommendation cards as the source of truth when available, but explain them through the family profile and time context.
- Use the provided Park Plan / Live View context before answering next-move questions.
- Use parkDayScheduleStatus to understand whether today has a saved park plan. If status is no_schedule, missing_today, before_trip_schedule, or after_trip_schedule, do not pretend there is a scheduled park today; use the active/live park, profile fallback, and recommendation cards unless the user asks about the saved schedule.
- If the active/live park differs from the planning park, do not treat that as a mistake. Right Now recommendations use the active/live park unless the user explicitly asks to switch parks or plan from a different park.
- If liveParkContext says the guest is viewing the second park, answer as if the guest is actively using that second park’s live waits and briefly account for any saved second-park must-dos.
- Use parkHopperContext as context for whether the second park matters and whether a hop is worth considering, but do not force a hop unless the user asks or the context clearly supports it.
- Never tell the guest that live help, day-of help, or in-park guidance is disabled because of a family profile preference. If this chat request reached you, TOHI is allowed to help. Access control is handled by the app UI before the message is sent.
- Treat legacy planningPreferences such as dayBeforeHelp/dayOfHelp as old setup hints only. Do not use them to refuse, limit, or downgrade guidance.
- Use the provided Trip Plan, Must-Dos, and Day Game Plan as structured context. The Day Game Plan is deterministic app output, not a draft for you to replace.
- Do not invent a brand-new strategy when the Day Game Plan exists. Explain it, adapt it to the user’s question, and call out tradeoffs when live waits, weather, location, or current family energy suggest a pivot.
- Must-Dos describe what would make the day feel successful. Protect them, but do not imply they should always override weather, distance, wait value, safety, or family energy.
- Never refer to Magic Kingdom's retired Splash Mountain as an active attraction. Use Tiana's Bayou Adventure instead.
- If the family profile includes a shortest rider height below a ride's height requirement, do not recommend that ride as a whole-family option. Only mention it as a split-party or Rider Switch option if the user's profile or question clearly supports that.
- Known Disney World height reminders: TRON 48 inches, Space Mountain 44 inches, Guardians 42 inches, Big Thunder 38 inches, Tiana's Bayou Adventure 40 inches, Seven Dwarfs Mine Train 38 inches.
- When mentioning multiple height-restricted rides, check the shortest rider height against every ride you mention. If the shortest rider is too short for several rides, list every affected ride instead of warning about only one or two.
- If the shortest rider is 36 inches, Space Mountain, TRON, Guardians, Tiana's Bayou Adventure, Big Thunder, and Seven Dwarfs Mine Train are not whole-family options. Mention Rider Switch or split-party only as an optional adult/older-rider strategy, not as the default family plan.
- Magic Kingdom parade distinction: Festival of Fantasy is the daytime parade, commonly around 3 PM. Disney Starlight: Dream the Night Away is the nighttime parade, commonly in the evening and dependent on park hours. Do not confuse the two.
- If mentioning Festival of Fantasy, treat it as a daytime/afternoon crowd-wave and princess/character moment, not an evening plan.
- If mentioning Disney Starlight, treat it as a nighttime parade/evening entertainment option, but avoid exact times unless live schedule context provides them.
- If mentioning parades, shows, or fireworks, avoid exact times unless live schedule context provides them and remind the guest to verify the official park schedule.
- Magic Kingdom fireworks viewing tip: for a lower-crowd alternative to the castle hub, recommend the Main Street USA Railroad Station/front platform near the park entrance. Be warm and informative: tell the guest to go up the stairs to the railroad station/front platform area, explain that the elevated view can feel calmer and less shoulder-to-shoulder than the hub, and note that being near the front of the park can make the exit feel easier. Include caveats naturally: stairs may be an issue for strollers or wheelchairs, accessible routing should be verified in person, access/ropes can vary, and guests should follow Cast Member direction. If timing matters, suggest checking the area about 30–45 minutes before fireworks, but remind them that showtimes and access can vary by night.
- Do not act like every guest is the same. Use children’s ages/heights, thrill tolerance, walking tolerance, heat sensitivity, park goals, trip dates, resort context, and planning preferences when available.
- If a family profile is incomplete, keep guidance more general and encourage completing setup for personalized recommendations.
- If the guest is currently in line for a ride, respect that choice. Do not tell them to skip it unless they say the ride is down, the line is unsafe, someone may be overheating/sick, there is true meltdown risk, or they ask whether to leave.
- If the guest is currently in line, use elapsed line time, posted wait when joined, weather, ride value, and family energy before advising them to stay or leave.
- When the user is already in line and asks whether to leave, do not give a hard "leave the line" answer unless safety/health, a stopped line, true meltdown risk, ride closure, or severe family distress clearly outweighs the ride value.
- If elapsed line time, whether the line is moving, must-do status, or family severity is missing, ask one quick clarifying question or give a clear stay-vs-leave threshold.
- For high-value waits on headliners or weather-demand rides, bias toward staying if the line is moving and the family can realistically make it, then recommend food, water, AC, or a resort break immediately after.
- If the guest is currently in line, focus on what to do after that ride, nearby backups, weather-safe options, and pacing.
- Do not invent ride availability, wait times, Lightning Lane status, showtimes, parade times, or operating hours.
- If live data may be stale or missing, say so briefly and advise refreshing or checking the official park app before walking far.
- Do not recommend outdoor or mixed attractions during active storm/lightning conditions unless the context clearly says it is safe.
- During heat mode, suggest water, shade, AC, indoor rides, quick-service water stops, and resort breaks only when the timing and family context make sense.
- Resort break boundary: do not recommend going back to the resort just because the family is tired, mildly cranky, or hot.
- Recommend a resort break when the trip plan/profile prefers or planned breaks, the day is in a natural heat/crash/rest window, the family has been in the park long enough for leaving to make sense, transportation/resort context makes the break realistic, the user directly asks about a break, or there is severe distress/overheating risk.
- If the family just arrived, the day is still getting started, or the user says they want to stay in the park, recommend an in-park reset first: water, snack, shade, AC, seated show, or an easy indoor/low-wait attraction.
- When a resort break is reasonable but not clearly required, give the resort-break path and a short stay-in-park fallback.
- When recommending a break, food stop, or recovery moment, always name a specific location. Never say "find some AC", "grab a snack", or "take a break" without saying where. Use the family’s active park and current land to pick the closest realistic option.
- When the family reports low energy, fading, tired, exhausted, hot, hungry, or needing a break, switch into recovery-first thinking.
- Low energy priority order: first assess whether an in-park reset or resort break fits the timing, preference, transportation, current activity, and family severity. If a resort break clearly fits, name the resort and how to get there. If not, recommend a specific nearby food/AC/shade/seated reset. If they still want to keep riding, recommend only short waits under 20–25 minutes, ideally indoor or seated.
- Hungry/food priority: if the family says they are hungry, have not eaten, or need food, recommend a specific nearby food location before recommending rides.
- Never route a tired or fading family into a long queue. Do not recommend rides with 35+ minute waits when low-energy or hungry signals are active unless the user specifically insists on that ride and you clearly warn about the tradeoff.
- During midday heat or afternoon crash windows, protect family energy before optimization.
- If time context says day_before, behave like a night-before trip planner: packing, timing, first moves, rope drop, food, transportation, and realistic expectations.
- If time context says day_of_rope_drop, focus on arrival, first attraction choice, avoiding wasted walking, and quick pivots.
- If time context says day_of_energy_management, prioritize shade, AC, food, hydration, lower walking, and family reset logic.
- If time context says day_of_evening_strategy, focus on final high-value rides, nighttime shows, transportation, tired kids, and exit strategy.
- Keep responses easy to act on while walking in a park.
- Avoid long essays. Give the next best move and why.
- If the user asks for a plan, give a simple ordered plan.
- If the user asks whether to cross the park, weigh distance against wait value, weather, and family energy.
- If the user has completed or skipped a ride, do not recommend it again unless they specifically ask about it.

Same-day completed activity behavior:
- When the user asks what they have done, finished, ridden, or completed today, summarize the "Completed activity today" context in plain language. Use attraction names first, then lands, completion times, and posted wait-at-start only when those details are available.
- When the user asks whether they already rode or finished a specific attraction, answer from "Completed activity today" and completed ride IDs only. If it is present, say yes and mention the completed attraction by name; include the time if available. If it is not present, say you do not see it in today's completed activity instead of guessing.
- Use today's completed activity to avoid treating finished attractions as unfinished priorities. Do not recommend an immediate repeat unless the family asks for a re-ride or the context clearly makes it a casual optional idea.
- Do not invent completed attractions, counts, times, waits, or lands. If completed activity details are absent, be honest about what you can and cannot see.
Transportation routing rules (apply whenever transportation is discussed):
- FIRST identify the DESTINATION being asked about. The "Transportation context" block covers exactly one journey: the current park to the guest's SELECTED resort. It is authoritative for that journey and for nothing else.
- If the destination IS the selected resort (getting back, heading to the room, a resort break): the structured direct access is AUTHORITATIVE. State that route first, by name, before discussing anything else.
- If the question is PARK-TO-PARK (theme park to theme park): answer ONLY from the separate "Park-to-park transportation" block. Do not apply or even mention the selected-resort route as the answer. An origin the guest names explicitly overrides the current park; if they name only a destination, use the current park as the origin; if the origin or destination is still unclear, ask one short clarification. If a pair genuinely cannot be resolved from that block, say so and point to official guidance rather than inventing a route.
- If the destination is ANOTHER resort, a hotel the guest is not staying at, Disney Springs, or any other location: do not reuse the selected resort's direct access as if it applied. Say that route is not verified by the trip setup, and recommend current official guidance rather than inventing one.
- If the destination is AMBIGUOUS ("how do we get there?", "what's the best way?"), ask which destination the guest means. Do not silently answer with the selected-resort route.
- For the selected-resort journey only: if every listed mode is direct, do not present a transfer, a Transportation and Ticket Center hop, or any multi-leg journey as the standard or preferred route.
- Describe a transfer ONLY when the structured mode explicitly marks one. Otherwise there is no transfer.
- Never contradict the structured direct access using general Disney knowledge, resort area, or geography. Do not infer a monorail, Skyliner, boat, walking route, or transfer from which park the guest is in.
- Never say a route runs only "if one is running" when the structured data confirms it. That manufactures doubt about verified trip data.
- Never claim fastest, quickest, or any comparative travel time, for any destination. This request carries no live transportation timing. Say "the direct option", "usually the simplest route", or "the option that avoids a transfer".
- If structured route data is unavailable, say the route cannot be verified from the trip setup and recommend checking current official signage or the My Disney Experience app.
- If the guest corrects a route ("doesn't a direct bus run from here?"), answer from the same structured data and correct any earlier unsupported route instead of defending it.
- The resort's general transportation list is descriptive only. A mode existing somewhere on property never overrides the park-specific direct access.
- If the guest has a dining reservation or planned meal near the current park, use that as the natural reset point before suggesting a far resort break.
- Use directAccess and breakStrategy before suggesting a resort break. breakStrategy describes effort and tone; it never determines the transportation mode.
- Do not recommend park → far resort → another resort movements unless the user clearly has enough time and wants a full reset.
- Do not suggest a resort as a quick break just because it is geographically nearby or has a transportation mode somewhere on property. Direct access from the current park matters.
- If GPS/current location context includes a nearest anchor, use it carefully. Treat it as "near X," not proof that the guest is in line for X unless current activity says they tapped In Line.
- If GPS confidence is low or border-area context is mentioned, avoid overconfident location claims and suggest confirming the closest area in the app.

Scope rules:
- Only answer questions related to Disney, Universal, theme parks, park strategy, rides, shows, food, weather, resorts, transportation, accessibility, family pacing, current trip logistics, or using TOHI.
- Do not help with unrelated topics such as schoolwork, coding, legal advice, medical advice, finance, stock trading, job applications, general research, personal writing, recipes, or anything outside park/trip support.
- If the user asks something unrelated, politely redirect them back to park planning.
- Keep redirects short and friendly.`;

const OFF_TOPIC_REPLY =
  "I’m here to help with your park day, ride strategy, weather, food breaks, resorts, transportation, and trip planning. Ask me what to do next in the park and I’ll help.";

function summarizeHistory(conversationHistory = []) {
  return conversationHistory.slice(-6).map((msg) => ({
    role: msg.role,
    content: String(msg.content || "").slice(0, 500),
  }));
}

function isClearlyOffTopic(message = "") {
  const text = String(message || "").toLowerCase().trim();

  if (!text) return false;

  const parkTerms = [
    "park",
    "ride",
    "rides",
    "line",
    "queue",
    "wait",
    "wait time",
    "disney",
    "magic kingdom",
    "epcot",
    "hollywood studios",
    "animal kingdom",
    "universal",
    "islands of adventure",
    "epic universe",
    "tron",
    "tiana",
    "big thunder",
    "haunted mansion",
    "pirates",
    "space mountain",
    "jungle cruise",
    "peoplemover",
    "carousel of progress",
    "small world",
    "peter pan",
    "seven dwarfs",
    "guardians",
    "remy",
    "frozen",
    "soarin",
    "test track",
    "weather",
    "rain",
    "storm",
    "lightning",
    "heat",
    "hydration",
    "water",
    "food",
    "restaurant",
    "quick service",
    "snack",
    "resort",
    "hotel",
    "transportation",
    "bus",
    "monorail",
    "skyliner",
    "boat",
    "walking",
    "stroller",
    "wheelchair",
    "scooter",
    "mobility",
    "family",
    "kids",
    "toddler",
    "break",
    "meltdown",
    "nap",
    "lightning lane",
    "multipass",
    "single pass",
    "rope drop",
    "fireworks",
    "parade",
    "show",
    "festival of fantasy",
    "starlight",
    "dream the night away",
    "castle",
    "characters",
    "what should we do",
    "what should i do",
    "what next",
    "next",
  ];

  if (parkTerms.some((term) => text.includes(term))) {
    return false;
  }

  const offTopicPatterns = [
    /\b(stock|stocks|crypto|bitcoin|trading|portfolio|investment|investing)\b/,
    /\b(homework|essay|paper|school assignment|research paper)\b/,
    /\b(resume|cover letter|job application|interview prep)\b/,
    /\b(code|coding|javascript|python|react|sql|debug this|write a program)\b/,
    /\b(recipe|cook|bake|keto|ingredients|nutrition label)\b/,
    /\b(legal|lawsuit|contract|attorney|court)\b/,
    /\b(medical|diagnose|symptoms|medicine|doctor|rash|headache)\b/,
    /\b(write me|rewrite|summarize this|translate|make a poem|song lyrics)\b/,
    /\b(math|algebra|calculus|equation|solve this)\b/,
  ];

  return offTopicPatterns.some((pattern) => pattern.test(text));
}

function formatRideCard(label, ride) {
  if (!ride) return `${label}: none`;

  const name = ride.name || "Unknown";
  const wait =
    ride.waitTime === null || ride.waitTime === undefined
      ? "unknown wait"
      : `${ride.waitTime} min wait`;

  const land = ride.land ? ` · land: ${ride.land}` : "";
  const reason = ride.reason ? ` · reason: ${ride.reason}` : "";
  const planAheadReason = ride.planAheadReason
    ? ` · strategy: ${ride.planAheadReason}`
    : "";
  const distance = ride.proximityDistance
    ? ` · proximity: ${ride.proximityDistance}`
    : "";
  const waitStatus = ride.waitValueStatus?.status
    ? ` · wait value: ${ride.waitValueStatus.status}`
    : "";
  const heightWarning = ride.heightWarning?.message
    ? ` · height warning: ${ride.heightWarning.message}`
    : "";
  const familyFit =
    ride.familyProfileModifier !== undefined
      ? ` · family fit modifier: ${ride.familyProfileModifier}`
      : "";
  const realityCheck =
    ride.planAheadRealityCheckModifier !== undefined
      ? ` · plan-ahead reality check: ${ride.planAheadRealityCheckModifier}`
      : "";

  return `${label}: ${name} · ${wait}${land}${distance}${waitStatus}${heightWarning}${familyFit}${realityCheck}${reason}${planAheadReason}`;
}

function buildWeatherContext(weather, weatherMode) {
  if (!weather && !weatherMode) {
    return "Weather: unavailable";
  }

  const temp = weather?.tempF ? `${weather.tempF}°F` : "temp unavailable";
  const feelsLike =
    weather?.feelsLikeF !== undefined && weather?.feelsLikeF !== null
      ? `feels like ${weather.feelsLikeF}°F`
      : "feels-like unavailable";
  const humidity =
    weather?.humidity !== undefined && weather?.humidity !== null
      ? `humidity: ${weather.humidity}%`
      : "humidity unavailable";
  const summary = weather?.summary || "summary unavailable";
  const rainRisk =
    weather?.rainRisk !== undefined && weather?.rainRisk !== null
      ? `rain risk: ${weather.rainRisk}`
      : "rain risk unavailable";
  const mode = weatherMode?.mode || "unknown";
  const label = weatherMode?.label || "unknown";
  const message = weatherMode?.message || "";
  const providerStormSignal = weather?.stormMode
    ? "provider storm signal: yes"
    : "provider storm signal: no";
  const activeStormMode = mode === "storm" ? "active storm mode: yes" : "active storm mode: no";

  return [
    `Weather: ${temp} · ${feelsLike} · ${humidity} · ${summary} · ${rainRisk} · ${providerStormSignal} · ${activeStormMode}`,
    `Weather mode: ${label} (${mode})`,
    message ? `Weather advice: ${message}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}


function formatFreshnessAge(ageMs) {
  if (ageMs == null) return "age unknown";

  const numericAgeMs = Number(ageMs);
  if (!Number.isFinite(numericAgeMs) || numericAgeMs < 0) {
    return "age unknown";
  }

  const minutes = Math.round(numericAgeMs / 60000);

  if (minutes < 1) return "less than 1 minute old";
  if (minutes === 1) return "1 minute old";
  if (minutes < 60) return `${minutes} minutes old`;

  const hours = Math.round(minutes / 60);
  if (hours === 1) return "about 1 hour old";
  return `about ${hours} hours old`;
}

function formatFreshnessItem(label, item = {}) {
  if (!item || typeof item !== "object") {
    return `- ${label}: freshness not provided.`;
  }

  const source = item.source || "unknown source";
  const ageLabel = formatFreshnessAge(item.ageMs);
  const hasData =
    typeof item.hasData === "boolean"
      ? item.hasData
        ? "data present"
        : "data missing"
      : "data presence unknown";
  const fetchedAt = item.fetchedAt ? `; fetched at ${item.fetchedAt}` : "";
  const clientLastUpdatedAt = item.clientLastUpdatedAt
    ? `; app last refreshed at ${item.clientLastUpdatedAt}`
    : "";

  return `- ${label}: ${hasData}; source ${source}; ${ageLabel}${fetchedAt}${clientLastUpdatedAt}.`;
}

function buildDataFreshnessContext(dataFreshness = {}) {
  if (!dataFreshness || typeof dataFreshness !== "object") {
    return "Data freshness: not provided.";
  }

  const tripPlan = dataFreshness.tripPlan || {};
  const tripPlanParts = [];

  if (tripPlan.status) tripPlanParts.push(`status ${tripPlan.status}`);
  if (typeof tripPlan.isStale === "boolean") {
    tripPlanParts.push(tripPlan.isStale ? "stale" : "not stale");
  }
  if (tripPlan.severity) tripPlanParts.push(`severity ${tripPlan.severity}`);
  if (tripPlan.ageMinutes != null) {
    tripPlanParts.push(`${tripPlan.ageMinutes} minutes old`);
  }

  const tripPlanLine = tripPlanParts.length
    ? `- Trip plan: ${tripPlanParts.join("; ")}.`
    : "- Trip plan: freshness not provided.";

  const reasons = Array.isArray(tripPlan.reasons) && tripPlan.reasons.length
    ? `\n- Trip plan freshness reasons: ${tripPlan.reasons.slice(0, 5).join("; ")}.`
    : "";

  return [
    "Data freshness:",
    formatFreshnessItem("Wait data", dataFreshness.waits),
    formatFreshnessItem("Weather data", dataFreshness.weather),
    tripPlanLine + reasons,
  ].join("\n");
}


function formatList(values = [], fallback = "none") {
  if (!Array.isArray(values) || !values.length) return fallback;
  return values.slice(0, 12).join(", ");
}


function getSimpleParkLabel(parkId = "", fallback = "unknown") {
  const labels = {
    magic_kingdom: "Magic Kingdom",
    epcot: "EPCOT",
    hollywood: "Hollywood Studios",
    animal_kingdom: "Animal Kingdom",
    universal_studios_florida: "Universal Studios Florida",
    islands_of_adventure: "Islands of Adventure",
    epic_universe: "Epic Universe",
  };

  return labels[parkId] || parkId || fallback;
}

function buildParkPlanContext(sessionData = {}) {
  const activeParkId = sessionData.activePark || "";
  const planningParkId = sessionData.planningPark || "";
  const scheduledPark = sessionData.scheduledParkForToday || {};
  const scheduledPrimaryParkId = scheduledPark.parkId || scheduledPark.primaryParkId || planningParkId || "";
  const scheduledSecondaryParkId =
    scheduledPark.secondaryParkId ||
    sessionData.scheduledSecondaryParkForToday ||
    "";
  const parkDayScheduleStatus = sessionData.parkDayScheduleStatus || {};
  const parkHopperContext = sessionData.parkHopperContext || {};
  const liveParkContext = sessionData.liveParkContext || {};
  const planTabState = sessionData.planTabState || {};
  const scheduledPlanLabel =
    sessionData.scheduledParkPlanLabel ||
    sessionData.todayPlannedParkLabel ||
    "";
  const secondParkMustDos = parkHopperContext.secondParkMustDos || {};
  const secondParkMustDoCount = Number(secondParkMustDos.count || 0);
  const secondParkMustDoLabel = secondParkMustDos.label || "";
  const activeParkLabel =
    sessionData.activeParkLabel ||
    liveParkContext.activeParkLabel ||
    getSimpleParkLabel(activeParkId);
  const planningParkLabel =
    sessionData.planningParkLabel ||
    liveParkContext.planningParkLabel ||
    getSimpleParkLabel(planningParkId);
  const scheduledPrimaryParkLabel =
    liveParkContext.scheduledPrimaryParkLabel ||
    getSimpleParkLabel(scheduledPrimaryParkId);
  const scheduledSecondaryParkLabel =
    sessionData.scheduledSecondaryParkLabel ||
    liveParkContext.scheduledSecondaryParkLabel ||
    parkHopperContext.secondaryParkLabel ||
    getSimpleParkLabel(scheduledSecondaryParkId, "");

  const lines = [
    "Park Plan / Live View context:",
    `- Active/live wait park: ${activeParkLabel} (${activeParkId || "unknown"})`,
    `- Planning park: ${planningParkLabel} (${planningParkId || "unknown"})`,
    `- Planning park source: ${sessionData.planningParkSource || "unknown"}`,
    parkDayScheduleStatus?.status
      ? `- Park-day schedule status: ${parkDayScheduleStatus.status} · ${parkDayScheduleStatus.label || ""}`
      : "- Park-day schedule status: unavailable",
    parkDayScheduleStatus?.guidance ? `- Park-day schedule guidance: ${parkDayScheduleStatus.guidance}` : null,
    parkDayScheduleStatus?.firstScheduleDate || parkDayScheduleStatus?.lastScheduleDate
      ? `- Saved schedule range: ${parkDayScheduleStatus.firstScheduleDate || "unknown"} to ${parkDayScheduleStatus.lastScheduleDate || "unknown"}`
      : null,
    parkDayScheduleStatus?.fallbackParkId
      ? `- Schedule fallback park: ${parkDayScheduleStatus.fallbackParkLabel || "unknown"} (${parkDayScheduleStatus.fallbackParkId})`
      : null,
    `- Manual planning park override: ${sessionData.planningParkManualOverride === true ? "yes" : "no"}`,
    scheduledPrimaryParkId
      ? `- Scheduled primary park today: ${scheduledPrimaryParkLabel} (${scheduledPrimaryParkId})`
      : "- Scheduled primary park today: none",
    scheduledSecondaryParkId
      ? `- Scheduled second park today: ${scheduledSecondaryParkLabel} (${scheduledSecondaryParkId})`
      : "- Scheduled second park today: none",
    scheduledPlanLabel ? `- Scheduled park plan label: ${scheduledPlanLabel}` : null,
    planTabState?.label ? `- Plan tab state: ${planTabState.label} (${planTabState.mode || "unknown"})` : null,
    liveParkContext?.status
      ? `- Live park context: ${liveParkContext.status} · ${liveParkContext.label || ""}`
      : "- Live park context: unavailable",
    liveParkContext?.guidance ? `- Live park guidance: ${liveParkContext.guidance}` : null,
    `- Live park mismatch: ${liveParkContext?.isLiveParkMismatch === true ? "yes" : "no"}`,
    parkHopperContext?.status
      ? `- Hopper context: ${parkHopperContext.status} · ${parkHopperContext.label || ""}`
      : "- Hopper context: unavailable",
    parkHopperContext?.guidance ? `- Hopper guidance: ${parkHopperContext.guidance}` : null,
    `- Hopper should consider second park: ${parkHopperContext?.shouldConsiderSecondPark === true ? "yes" : "no"}`,
    `- Second park priority: ${parkHopperContext?.secondParkPriority || "unknown"}`,
    `- Second park must-dos: ${secondParkMustDoCount}${secondParkMustDoLabel ? ` · ${secondParkMustDoLabel}` : ""}`,
    sessionData.chatResponseMode ? `- Chat response mode: ${sessionData.chatResponseMode}` : null,
    sessionData.chatFieldTestIntent ? `- Chat field-test intent: ${sessionData.chatFieldTestIntent}` : null,
    sessionData.activeLandLabel || sessionData.currentLand
      ? `- Active land context: ${sessionData.activeLandLabel || sessionData.currentLand}`
      : null,
    "- AI handling: For immediate next-move answers, make one specific recommendation using the active/live park waits, current land, family state, weather, and recommendation cards. Do not explain schedule fallback or missing schedule status unless the user asks why the plan changed. If the live park is the scheduled second park, treat that as intentional context, not a contradiction. If no saved park day matches today, do not invent one; quietly treat the planning park as the profile fallback.",
  ];

  return lines.filter(Boolean).join("\n");
}


function buildFamilyProfileContext(familyProfile) {
  if (!familyProfile) {
    return "Family profile: unavailable";
  }

  const priorities = formatList(familyProfile.priorities);
  const selectedParks = formatList(familyProfile.tripContext?.selectedParks);
  const children = Array.isArray(familyProfile.children)
    ? familyProfile.children
        .slice(0, 10)
        .map((child, index) => {
          const age = child.age === "" || child.age == null ? "unknown age" : `${child.age}`;
          const height =
            child.heightInches === "" || child.heightInches == null
              ? "unknown height"
              : `${child.heightInches} in`;
          return `child ${index + 1}: age ${age}, ${height}`;
        })
        .join("; ")
    : "none";

  const ageSummary = familyProfile.ageSummary || {};
  const resortContext = familyProfile.resortContext || {};
  const planning = familyProfile.planningPreferences || {};
  const trip = familyProfile.tripContext || {};

  return [
    "Family profile:",
    `- Setup complete: ${familyProfile.isSetupComplete === true ? "yes" : "no"}`,
    `- Party: ${familyProfile.adultCount ?? "unknown"} adults, ${familyProfile.childCount ?? "unknown"} children, ${familyProfile.partySize ?? "unknown"} total`,
    `- Age summary: ${ageSummary.under3Count ?? 0} under 3, ${ageSummary.childCount ?? 0} Disney children, ${ageSummary.disneyAdultCount ?? 0} Disney adults`,
    `- Children: ${children}`,
    `- Shortest child/rider height: ${
      familyProfile.shortestHeightInches != null
        ? `${familyProfile.shortestHeightInches} in`
        : "not set"
    }`,
    `- Whole-group ride rule: ${familyProfile.wholeGroupRidesTogether || "unknown"}`,
    `- Thrill tolerance: ${familyProfile.thrillTolerance || "unknown"}`,
    `- Walking tolerance: ${familyProfile.walkingTolerance || "unknown"}`,
    `- Heat sensitivity: ${familyProfile.heatSensitivity || "unknown"}`,
    `- Water ride preference: ${familyProfile.waterRidePreference || "unknown"}`,
    `- Family pace: ${familyProfile.pace || "unknown"}`,
    `- Priorities: ${priorities}`,
    `- Trip dates: ${trip.tripStartDate || "not set"} to ${trip.tripEndDate || "not set"}`,
    `- Trip length / park days: ${trip.tripLengthDays || "unknown"} days / ${trip.parkDays || "unknown"} park days`,
    `- Selected parks: ${selectedParks}`,
    `- First park: ${trip.firstPark || "unknown"}`,
    `- Priority park: ${trip.priorityPark || "unknown"}`,
    `- Park hopper: ${trip.parkHopper || "unknown"}`,
    `- Planning mode: ${planning.planningMode || "unknown"}`,
    `- Legacy planning hints: use only for context, never as an access/permission rule`,
    `- Rope drop style: ${planning.ropeDropStyle || "unknown"}`,
    `- Midday break style: ${planning.middayBreakStyle || "unknown"}`,
    `- Dining style: ${planning.diningStyle || "unknown"}`,
    `- Resort/on-property: ${resortContext.stayingOnProperty || "unknown"}`,
    `- Resort name: ${resortContext.resortName || resortContext.offPropertyHotelName || "not set"}`,
    `- Main transportation today: ${resortContext.transportationMode || "unknown"}`,
    `- Lightning Lane / Single Pass preference: ${familyProfile.lightningLanePreference || "unknown"}`,
  ].join("\n");
}

function buildResortProfileContext(familyProfile, activePark) {
  const profile = familyProfile?.resortProfile;

  if (!profile) {
    return "Resort profile: unavailable or off-property/unknown";
  }

  const transport = formatList(profile.transportation);
  const nearestParks = formatList(profile.nearestParks);
  const directAccess = profile.directAccess?.[activePark] || [];
  const currentBreakStrategy =
    profile.breakStrategy?.[activePark] ||
    "No specific break strategy available for the current park.";

  return [
    "Selected Disney resort profile:",
    `- Resort: ${profile.name || "unknown"}`,
    `- Area: ${profile.areaLabel || profile.area || "unknown"}`,
    `- Nearest parks: ${nearestParks}`,
    `- Transportation modes: ${transport}`,
    `- Direct access from current park (${activePark || "unknown"}): ${formatList(directAccess)}`,
    `- Current park break strategy: ${currentBreakStrategy}`,
  ].join("\n");
}

function buildTimeContext(timeContext) {
  if (!timeContext) {
    return "Time context: unavailable";
  }

  const tripStatus = timeContext.tripStatus || {};
  const aiAccess = timeContext.aiAccess || {};

  return [
    "Time context:",
    `- Orlando now: ${timeContext.orlandoDateLabel || timeContext.orlandoDate || "unknown"} · ${timeContext.orlandoTimeLabel || "unknown time"} · ${timeContext.orlandoWeekday || "unknown weekday"}`,
    `- Day phase: ${timeContext.dayPhaseLabel || timeContext.dayPhase || "unknown"}`,
    `- Planning mode for now: ${timeContext.planningMode || "unknown"}`,
    `- Trip status: ${tripStatus.status || "unknown"} · ${tripStatus.message || "no message"}`,
    `- Trip day number: ${tripStatus.dayNumber || "not active"}`,
    `- AI access phase: ${aiAccess.phase || "unknown"} · allowed: ${
      aiAccess.shouldAllowAi === false ? "no" : "yes"
    } · ${aiAccess.reason || "no reason"}`,
    `- Think like day-before planner: ${timeContext.shouldThinkLikeDayBeforePlanner ? "yes" : "no"}`,
    `- Think like in-park guide: ${timeContext.shouldThinkLikeInParkGuide ? "yes" : "no"}`,
    `- Protect family energy: ${timeContext.shouldProtectFamilyEnergy ? "yes" : "no"}`,
    timeContext.summary ? `- Summary: ${timeContext.summary}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCurrentActivityContext(currentActivity) {
  if (!currentActivity) {
    return "Current activity: none";
  }

  if (currentActivity.type === "in_line") {
    const rideName = currentActivity.rideName || "unknown ride";
    const land = currentActivity.land ? ` · land: ${currentActivity.land}` : "";
    const postedWait =
      currentActivity.postedWaitAtStart !== null &&
      currentActivity.postedWaitAtStart !== undefined
        ? ` · posted wait when joined: ${currentActivity.postedWaitAtStart} min`
        : " · posted wait when joined: unknown";
    const elapsed =
      currentActivity.elapsedMinutesInLine !== null &&
      currentActivity.elapsedMinutesInLine !== undefined
        ? ` · elapsed time in line: ${currentActivity.elapsedMinutesInLine} min`
        : " · elapsed time in line: unknown";
    const startedAt = currentActivity.startedAt
      ? ` · started at: ${currentActivity.startedAt}`
      : "";
    const summary = currentActivity.summary
      ? `\nCurrent activity summary: ${currentActivity.summary}`
      : "";

    return `Current activity: guest is in line for ${rideName}${land}${postedWait}${elapsed}${startedAt}${summary}`;
  }

  return `Current activity: ${currentActivity.type || "unknown"}`;
}

function buildLocationContext(locationContext, currentLand) {
  if (!locationContext) {
    return `Location context: manual/current land only · land: ${currentLand || "unknown"}`;
  }

  const type = locationContext.type || locationContext.source || "unknown";
  const land =
    locationContext.landLabel ||
    locationContext.landKey ||
    locationContext.land ||
    currentLand ||
    "unknown";

  const nearestAnchorName =
    locationContext.nearestAnchorName ||
    locationContext.detectedLocation?.nearestAnchorName ||
    null;

  const nearestAnchorId =
    locationContext.nearestAnchorId ||
    locationContext.detectedLocation?.nearestAnchorId ||
    null;

  const distanceMeters =
    locationContext.distanceMeters ??
    locationContext.detectedLocation?.distanceMeters ??
    null;

  const confidence =
    locationContext.confidence ||
    locationContext.detectedLocation?.confidence ||
    null;

  const updatedAt =
    locationContext.updatedAt ||
    locationContext.detectedLocation?.updatedAt ||
    null;

  const message = locationContext.locationMessage || "";

  const parts = [
    `Location context: ${type}`,
    `current/selected land: ${currentLand || "unknown"}`,
    `detected land: ${land}`,
    nearestAnchorName ? `nearest anchor: ${nearestAnchorName}` : null,
    nearestAnchorId ? `nearest anchor id: ${nearestAnchorId}` : null,
    distanceMeters !== null ? `distance: ${distanceMeters} meters` : null,
    confidence ? `GPS confidence: ${confidence}` : null,
    updatedAt ? `location updated: ${updatedAt}` : null,
    message ? `location note: ${message}` : null,
  ];

  return parts.filter(Boolean).join(" · ");
}

// 64C-2. How each structured directAccess value is described in the prompt.
//
// These are the values that already exist in resortProfiles.js. Nothing here is
// a route table: it is a label for a value the data already carries, so adding a
// resort or a mode to that file needs no change here beyond a new label.
//
// The split that matters is direct vs transfer-required. The structured data
// marks a transfer explicitly (monorail_transfer, walking_to_ttc,
// skyliner_via_epcot); every other value is a direct route. A transfer may be
// described ONLY when the value marks one.
const DIRECT_ROUTE_LABELS = {
  bus: "direct Disney bus",
  monorail: "monorail",
  skyliner: "Disney Skyliner",
  walking: "walking path",
  water_taxi: "boat / water taxi",
};

const TRANSFER_ROUTE_LABELS = {
  monorail_transfer: "monorail with a transfer",
  walking_to_ttc: "walking to the Transportation and Ticket Center, then a transfer",
  skyliner_via_epcot: "Disney Skyliner via an EPCOT transfer",
};

function describeStructuredRoute(mode) {
  if (DIRECT_ROUTE_LABELS[mode]) {
    return { mode, label: DIRECT_ROUTE_LABELS[mode], requiresTransfer: false };
  }
  if (TRANSFER_ROUTE_LABELS[mode]) {
    return { mode, label: TRANSFER_ROUTE_LABELS[mode], requiresTransfer: true };
  }
  // An unrecognised value is reported as unverified rather than guessed at.
  return { mode, label: `${mode} (not a recognised structured mode)`, requiresTransfer: null };
}

// 64C-2. Transportation context, built from the guest's OWN resort profile.
//
// This used to take only activePark and emit a hardcoded block: at Magic Kingdom
// it listed Wilderness Lodge, Contemporary, Polynesian and Grand Floridian — all
// monorail/boat resorts — no matter where the family was actually staying. A
// guest at Port Orleans French Quarter, whose structured route is a direct bus,
// was handed a monorail framing and the model blended the two into a
// Monorail-to-TTC-then-bus answer that the data flatly contradicts.
//
// So the park-only framing is gone. The route now comes from
// resortProfile.directAccess[activePark] and nothing else. breakStrategy still
// appears, but only as effort/tone — it never decides a mode. The general
// transportation[] list is descriptive only and is labelled as such, because a
// mode existing somewhere on property says nothing about this park's route.
function buildTransportationContext(activePark, familyProfile) {
  const profile = familyProfile?.resortProfile;
  const parkKey = String(activePark || "").trim();
  const header =
    "Transportation context — route from the CURRENT PARK to the SELECTED RESORT only:";

  if (!profile) {
    return [
      header,
      "- No Disney resort profile is selected (off-property, unknown, or not yet set up).",
      "- Structured route data is UNAVAILABLE. Do not state or imply any specific route.",
      "- This block never covers park-to-park travel (see the separate Park-to-park transportation block) or any other destination.",
      "- Say the route cannot be verified from the trip setup and recommend checking current official signage or the My Disney Experience app.",
    ].join("\n");
  }

  const routes = profile.directAccess?.[parkKey];

  if (!Array.isArray(routes) || routes.length === 0) {
    return [
      header,
      `- Resort: ${profile.name || "unknown"}.`,
      `- Current park: ${parkKey || "unknown"}.`,
      "- Structured route data for this park is UNAVAILABLE for this resort.",
      "- Do not infer a route from geography, from the resort area, or from general Disney knowledge.",
      "- This block never covers park-to-park travel (see the separate Park-to-park transportation block) or any other destination.",
      "- Say the route cannot be verified and recommend checking current official signage or the My Disney Experience app.",
    ].join("\n");
  }

  const described = routes.map(describeStructuredRoute);
  const direct = described.filter((r) => r.requiresTransfer === false);
  const transfers = described.filter((r) => r.requiresTransfer === true);
  const unknown = described.filter((r) => r.requiresTransfer === null);

  const lines = [
    header,
    `- Resort: ${profile.name || "unknown"}.`,
    `- Current park: ${parkKey}.`,
    `- Structured direct access, current park to the selected resort: ${formatList(routes)}.`,
  ];

  if (direct.length) {
    lines.push(
      `- DIRECT route(s), no transfer required: ${direct.map((r) => r.label).join("; ")}.`,
      "- State this route first ONLY when the guest is asking how to reach or return to this selected resort. It is the direct option and normal scheduled service."
    );
  }

  if (transfers.length) {
    lines.push(
      `- TRANSFER-REQUIRED route(s): ${transfers.map((r) => r.label).join("; ")}.`,
      "- A transfer is genuinely required here, so describing the transfer is correct."
    );
  } else {
    lines.push(
      "- No transfer is indicated for this route. Do not describe a transfer, a Transportation and Ticket Center hop, or any multi-leg journey as the standard or preferred way."
    );
  }

  if (unknown.length) {
    lines.push(
      `- Unrecognised structured value(s): ${formatList(unknown.map((r) => r.mode))}. Treat these as unverified.`
    );
  }

  const otherModes = (profile.transportation || []).filter(
    (mode) => !routes.includes(mode)
  );

  if (otherModes.length) {
    lines.push(
      `- Other modes that exist at this resort but are NOT this park's route: ${formatList(otherModes)}. Descriptive only — these must never override the structured direct access above.`
    );
  }

  lines.push(
    "- No live transportation timing is available in this request. Do not claim fastest, quickest, or a comparative travel time. Say 'the direct option', 'usually the simplest route', or 'the option that avoids a transfer'.",
    "- DESTINATION SCOPE: this block answers only 'how do we get from this park to our resort'. For a park-to-park question, IGNORE this block and use the separate \"Park-to-park transportation\" block, which is verified for those journeys. For another resort or any other destination, neither block applies — say current official guidance should be checked rather than inventing a route.",
    "- If the destination is unclear, ask which destination the guest means before answering."
  );

  if (profile.breakStrategy?.[parkKey]) {
    lines.push(
      `- Break effort/tone for this park (does NOT determine the mode): ${profile.breakStrategy[parkKey]}`
    );
  }

  return lines.join("\n");
}


// 64C-3C. Park display names. Labels only — no route facts live here.
const PARK_DISPLAY_NAMES = {
  magic_kingdom: "Magic Kingdom",
  epcot: "EPCOT",
  hollywood: "Disney's Hollywood Studios",
  animal_kingdom: "Disney's Animal Kingdom",
};

// The exact-ID resolver deliberately rejects anything it does not recognise, so
// aliases are normalised HERE rather than by loosening the resolver. Anything
// unrecognised becomes "" — unknown — which the prompt then reports honestly
// instead of guessing an origin.
function normalizeParkToParkParkId(parkId) {
  const raw = String(parkId || "").trim();

  if (!raw) return "";
  if (raw === "hollywood_studios" || raw === "disney_hollywood_studios") return "hollywood";

  return PARK_TO_PARK_PARK_IDS.includes(raw) ? raw : "";
}

function describeParkToParkRoute(route) {
  const parts = [route.label];

  if (route.transferRequired && route.transferLocation) {
    parts.push(`transfer at ${route.transferLocation}`);
  }
  if (route.boardingDetail) {
    parts.push(route.boardingDetail);
  }

  return parts.join(" — ");
}

// 64C-3C. Park-to-park transportation context.
//
// Deliberately SEPARATE from buildTransportationContext, which covers the
// current park to the guest's SELECTED RESORT. Merging them is what produced the
// original defect: one block answering two different journeys.
//
// This renders the whole verified 12-route reference and lets the model match
// the guest's own wording against it. There is no parser here on purpose — a
// homemade regex for "from X to Y" would be a new place to be wrong, and reading
// natural language is the one thing the model is better at than we are.
//
// Kept out of the prompt: source URLs and verification dates (audit metadata,
// not guidance) and the per-entry caveat, which is rendered once at the end
// rather than twelve times.
function buildParkToParkTransportationContext(activePark) {
  const origin = normalizeParkToParkParkId(activePark);

  const lines = [
    "Park-to-park transportation (verified structured data — authoritative for travel BETWEEN theme parks):",
    origin
      ? `- Current park: ${PARK_DISPLAY_NAMES[origin]}. Use it as the origin when the guest names only a destination.`
      : "- Current park: unknown. If the guest names only a destination, ask which park they are starting from.",
  ];

  for (const entry of PARK_TO_PARK_ROUTES) {
    const from = PARK_DISPLAY_NAMES[entry.originPark] || entry.originPark;
    const to = PARK_DISPLAY_NAMES[entry.destinationPark] || entry.destinationPark;
    const options = entry.routes.map(describeParkToParkRoute).join(" OR ");
    lines.push(`- ${from} to ${to}: ${options}`);
  }

  lines.push(
    "- Every option above is verified. Present all listed options for a pair; do not drop one.",
    "- Do not rank these options as fastest, quickest or best, and do not state travel times, service intervals or operating hours — none of that is in this data.",
    `- Close with: ${PARK_TO_PARK_OPERATIONAL_CAVEAT}`
  );

  return lines.join("\n");
}

function getTripPlanPreferences(tripPlan = {}) {
  return tripPlan?.preferences && typeof tripPlan.preferences === "object"
    ? tripPlan.preferences
    : {};
}

function getMustDoExperiencesFromSession(sessionData = {}) {
  if (Array.isArray(sessionData.mustDoExperiences)) {
    return sessionData.mustDoExperiences;
  }

  if (Array.isArray(sessionData.tripPlan?.mustDoExperiences)) {
    return sessionData.tripPlan.mustDoExperiences;
  }

  return [];
}

function formatMustDoExperience(experience = {}) {
  const name = experience.name || experience.id || "Unnamed experience";
  const type = experience.type ? ` (${experience.type})` : "";
  const land = experience.land ? ` · ${experience.land}` : "";
  const priority = experience.priority ? ` · priority: ${experience.priority}` : "";

  return `- ${name}${type}${land}${priority}`;
}

function formatDayGamePlanItem(item = {}) {
  const label = item.eyebrow || item.id || "Plan anchor";
  const title = item.title || "";
  const body = item.body || "";
  const detail = item.detail ? ` Detail: ${item.detail}` : "";
  const priority = item.priorityLabel || item.priority || "";

  return `- ${label}${priority ? ` [${priority}]` : ""}: ${title}${body ? ` — ${body}` : ""}${detail}`;
}

function buildTripPlanContext(sessionData = {}) {
  const preferences = getTripPlanPreferences(sessionData.tripPlan);
  const mustDoExperiences = getMustDoExperiencesFromSession(sessionData);
  const dayGamePlan = Array.isArray(sessionData.dayGamePlan) ? sessionData.dayGamePlan : [];

  const preferenceLines = [
    preferences.startStrategy ? `- Start strategy: ${preferences.startStrategy}` : "",
    preferences.breakPreference ? `- Break style: ${preferences.breakPreference}` : "",
    preferences.diningStyle ? `- Food rhythm: ${preferences.diningStyle}` : "",
    preferences.showsImportance ? `- Shows/parades importance: ${preferences.showsImportance}` : "",
    preferences.nighttimeImportance ? `- Nighttime plan: ${preferences.nighttimeImportance}` : "",
    preferences.paidQueueStrategy ? `- Paid queue strategy: ${preferences.paidQueueStrategy}` : "",
  ].filter(Boolean);

  const mustDoLines = mustDoExperiences
    .slice(0, 12)
    .map(formatMustDoExperience)
    .filter(Boolean);

  const gamePlanLines = dayGamePlan
    .slice()
    .sort((a, b) => (a.order || 99) - (b.order || 99))
    .slice(0, 8)
    .map(formatDayGamePlanItem)
    .filter(Boolean);

  if (!preferenceLines.length && !mustDoLines.length && !gamePlanLines.length) {
    return "Trip Plan / Day Game Plan context: none provided.";
  }

  return [
    "Trip Plan / Day Game Plan context:",
    "Use this as app-generated structured strategy. Do not replace it with a new invented plan.",
    preferenceLines.length ? "Trip preferences:" : "",
    ...preferenceLines,
    mustDoLines.length ? "Selected must-do moments:" : "",
    ...(mustDoLines.length ? mustDoLines : ["- none selected"]),
    gamePlanLines.length ? "Deterministic Day Game Plan anchors:" : "",
    ...(gamePlanLines.length ? gamePlanLines : ["- none generated"]),
  ]
    .filter(Boolean)
    .join("\n");
}

function getMostRecentUserMessageFromHistory(conversationHistory = [], fallbackMessage = "") {
  const lastUserMessage = [...(conversationHistory || [])]
    .reverse()
    .find((entry) => entry.role === "user");

  return String(lastUserMessage?.content || fallbackMessage || "");
}

function previousAssistantWasLiveStateQuestion(conversationHistory = []) {
  const lastAssistantMessage = [...(conversationHistory || [])]
    .reverse()
    .find((entry) => entry.role === "assistant");

  if (lastAssistantMessage?.isLiveStateQuestion === true) return true;

  const content = String(lastAssistantMessage?.content || "").toLowerCase();

  return (
    content.includes("still going") ||
    content.includes("starting to fade") ||
    content.includes("ready to hit something big") ||
    content.includes("starting to wind down") ||
    content.includes("energy right now") ||
    content.includes("how's the crew") ||
    content.includes("how's everyone's energy") ||
    content.includes("how are the little ones")
  );
}

function escapeRegExp(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function textIncludesAny(text = "", patterns = []) {
  if (!text || !Array.isArray(patterns) || patterns.length === 0) {
    return false;
  }

  const normalizedText = String(text).toLowerCase();

  return patterns.some((pattern) => {
    const normalizedPattern = String(pattern || "").trim().toLowerCase();

    if (!normalizedPattern) {
      return false;
    }

    const phrasePattern = escapeRegExp(normalizedPattern).replace(/\s+/g, "\\s+");
    const matcher = new RegExp(`(^|[^a-z0-9])${phrasePattern}([^a-z0-9]|$)`, "i");

    return matcher.test(normalizedText);
  });
}

function normalizeLiveFamilyStatePayload(payload) {
  if (!payload || typeof payload !== "object") return null;

  const needs = Array.isArray(payload.needs)
    ? payload.needs.map((need) => String(need || "").trim()).filter(Boolean).slice(0, 8)
    : [];

  return {
    sourceText: String(payload.sourceText || ""),
    source: String(payload.source || ""),
    cameFromLiveStateQuestion: payload.cameFromLiveStateQuestion === true,
    energy: String(payload.energy || "unknown"),
    needs,
    intent: String(payload.intent || "unknown"),
    recoveryMode: payload.recoveryMode === true,
    confidence: String(payload.confidence || "none"),
    shouldRecommendNow: payload.shouldRecommendNow === true,
    summary: String(payload.summary || ""),
  };
}

function detectLiveFamilyState(message = "", conversationHistory = []) {
  const sourceText = getMostRecentUserMessageFromHistory(conversationHistory, message);
  const text = String(sourceText || "").toLowerCase();
  const cameFromLiveStateQuestion = previousAssistantWasLiveStateQuestion(conversationHistory);

  const readyPatterns = [
    "ready",
    "one more",
    "keep going",
    "keep moving",
    "still going",
    "good to go",
    "we're good",
    "were good",
    "we are good",
    "up for it",
    "want to ride",
    "another ride",
  ];

  const tiredPatterns = [
    "tired",
    "exhausted",
    "wiped",
    "drained",
    "fading",
    "starting to fade",
    "low energy",
    "done walking",
    "cranky",
    "meltdown",
    "melting down",
    "overwhelmed",
    "overstimulated",
  ];

  const hotPatterns = [
    "hot",
    "overheated",
    "too hot",
    "need ac",
    "need a/c",
    "need air",
    "air conditioning",
    "cool down",
    "cool off",
    "shade",
  ];

  const hungryPatterns = [
    "hungry",
    "starving",
    "need food",
    "needs food",
    "food",
    "eat",
    "lunch",
    "dinner",
    "snack",
  ];

  const needs = [];
  if (textIncludesAny(text, hungryPatterns)) needs.push("food");
  if (textIncludesAny(text, hotPatterns)) needs.push("ac_or_shade");
  if (textIncludesAny(text, ["bathroom", "restroom", "potty"])) needs.push("bathroom");
  if (textIncludesAny(text, ["water", "thirsty", "dehydrated", "drink"])) needs.push("water");
  if (textIncludesAny(text, ["calm", "quiet", "sensory", "overwhelmed", "overstimulated"])) needs.push("calm");
  if (textIncludesAny(text, tiredPatterns) || text.includes("need a break") || text.includes("rest")) {
    needs.push("rest");
  }

  const wantsOneMore = textIncludesAny(text, readyPatterns);
  const isTired = textIncludesAny(text, tiredPatterns);
  const isHot = textIncludesAny(text, hotPatterns);
  const isHungry = textIncludesAny(text, hungryPatterns);
  const isWindingDown = textIncludesAny(text, [
    "wind down",
    "winding down",
    "head out",
    "done for the day",
    "ready to leave",
    "leaving the park",
    "leave the park",
    "back to hotel",
    "back to resort",
    "call it a day",
  ]);

  let energy = "unknown";
  if (isWindingDown || isTired) energy = "tired";
  else if (isHot || isHungry) energy = "fading";
  else if (wantsOneMore) energy = "ready";

  let intent = "unknown";
  if (isWindingDown) intent = "wind_down";
  else if (isTired || isHot || isHungry || needs.includes("rest") || needs.includes("calm")) intent = "reset";
  else if (wantsOneMore) intent = "one_more_ride";

  const uniqueNeeds = Array.from(new Set(needs));
  const recoveryMode =
    energy === "tired" ||
    energy === "fading" ||
    intent === "reset" ||
    uniqueNeeds.length > 0;

  const confidence =
    cameFromLiveStateQuestion && (energy !== "unknown" || uniqueNeeds.length || intent !== "unknown")
      ? "strong"
      : energy !== "unknown" || uniqueNeeds.length || intent !== "unknown"
      ? "normal"
      : "none";

  return {
    sourceText,
    source: cameFromLiveStateQuestion ? "live_state_answer" : "user_message",
    cameFromLiveStateQuestion,
    energy,
    needs: uniqueNeeds,
    intent,
    recoveryMode,
    confidence,
    shouldRecommendNow: cameFromLiveStateQuestion,
    strength: confidence,
    lowEnergy: energy === "tired" || energy === "fading",
    hungry: uniqueNeeds.includes("food"),
    wantsToKeepMoving: intent === "one_more_ride",
    summary:
      confidence === "none"
        ? ""
        : `Family state from latest chat: energy=${energy}; intent=${intent}; needs=${
            uniqueNeeds.length ? uniqueNeeds.join(", ") : "none"
          }.`,
  };
}

function buildLiveFamilyStateContext(liveFamilyState = {}) {
  if (!liveFamilyState || liveFamilyState.confidence === "none") return "";

  const needsLabel = Array.isArray(liveFamilyState.needs) && liveFamilyState.needs.length
    ? liveFamilyState.needs.join(", ")
    : "none";

  const lines = [
    "Live family state handoff:",
    `- Source: ${liveFamilyState.source || "unknown"}`,
    `- Energy: ${liveFamilyState.energy || "unknown"}`,
    `- Intent: ${liveFamilyState.intent || "unknown"}`,
    `- Needs: ${needsLabel}`,
    liveFamilyState.summary ? `- Summary: ${liveFamilyState.summary}` : null,
    liveFamilyState.shouldRecommendNow || liveFamilyState.cameFromLiveStateQuestion
      ? "- Conversation handling: The guest answered TOHI's check-in. Use this answer and continue the conversation; do not ask the same state question again."
      : null,
    liveFamilyState.recoveryMode
      ? "- Recommendation bias: favor food, AC/shade, water, bathroom, calm, seated reset, or a short low-friction attraction before bigger moves."
      : "- Recommendation bias: if the family is ready, a nearby ride or the best active recommendation is appropriate.",
  ];

  return lines.filter(Boolean).join("\n");
}

function formatCompletedActivityLogForContext(activityLog = []) {
  if (!Array.isArray(activityLog)) return "";

  const entries = activityLog
    .filter((entry) => entry?.type === "completed_ride")
    .filter((entry) => typeof entry?.rideName === "string" && entry.rideName.trim())
    .slice(-8);

  if (entries.length === 0) return "";

  return entries
    .map((entry) => {
      const rideName = entry.rideName.trim();
      const land =
        typeof entry.land === "string" && entry.land.trim()
          ? ` (${entry.land.trim()})`
          : "";
      const completedTime =
        typeof entry.completedAtDisplay === "string" && entry.completedAtDisplay.trim()
          ? entry.completedAtDisplay.trim()
          : entry.completedAt || "time unknown";
      const postedWaitAtStart = Number(entry.postedWaitAtStart);
      const waitText = Number.isFinite(postedWaitAtStart)
        ? `; posted wait when line started: ${postedWaitAtStart} min`
        : "";

      return `${rideName}${land} completed at ${completedTime}${waitText}`;
    })
    .join(" | ");
}

function buildDynamicContext(sessionData = {}) {
  const {
    activePark,
    currentLand,
    currentActivity,
    currentActivityContext,
    familyProfile,
    timeContext,
    locationContext,
    weather,
    weatherMode,
    dataFreshness,
    recommendations = {},
    tripPlan,
    mustDoExperiences = [],
    dayGamePlan = [],
    planningPark,
    planningParkSource,
    planningParkManualOverride,
    scheduledParkForToday,
    scheduledParkPlanLabel,
    todayPlannedParkLabel,
    scheduledSecondaryParkForToday,
    scheduledSecondaryParkLabel,
    parkDayScheduleStatus,
    parkHopperContext,
    liveParkContext,
    planTabState,
    planningTimeContext,
    chatResponseMode,
    chatFieldTestIntent,
    activeLandLabel,
    completedRideIds = [],
    activityLog = [],
    skippedRideIds = [],
    reportedRideIssueIds = [],
    message = "",
    conversationHistory = [],
  } = sessionData;

  const liveFamilyState =
    normalizeLiveFamilyStatePayload(sessionData.latestFamilyState || sessionData.liveFamilyState) ||
    detectLiveFamilyState(message, conversationHistory);
  const liveFamilyStateContext = buildLiveFamilyStateContext(liveFamilyState);

  const completedActivityContext = formatCompletedActivityLogForContext(activityLog);

  return [
    `Active park: ${activePark || "unknown"}`,
    buildParkPlanContext({
      activePark,
      planningPark,
      planningParkSource,
      planningParkManualOverride,
      scheduledParkForToday,
      scheduledParkPlanLabel,
      todayPlannedParkLabel,
      scheduledSecondaryParkForToday,
      scheduledSecondaryParkLabel,
      parkDayScheduleStatus,
      parkHopperContext,
      liveParkContext,
      planTabState,
      chatResponseMode,
      chatFieldTestIntent,
      activeLandLabel,
      currentLand,
      activeParkLabel: sessionData.activeParkLabel,
      planningParkLabel: sessionData.planningParkLabel,
    }),
    liveFamilyStateContext || null,
    `Live-state clarification pending: ${sessionData.liveStateClarificationPending === true ? "yes - user is answering the prior clarifying question; recommend now" : "no"}`,
    buildTimeContext(timeContext),
    planningTimeContext ? `Planning-park time context:\n${buildTimeContext(planningTimeContext)}` : null,
    buildFamilyProfileContext(familyProfile),
    buildResortProfileContext(familyProfile, activePark),
    buildTripPlanContext({ tripPlan, mustDoExperiences, dayGamePlan }),
    buildLocationContext(locationContext, currentLand),
    buildTransportationContext(activePark, familyProfile),
    buildParkToParkTransportationContext(activePark),
    buildCurrentActivityContext(currentActivityContext || currentActivity),
    buildWeatherContext(weather, weatherMode),
    buildDataFreshnessContext(dataFreshness),
    "",
    "Current recommendation cards:",
    formatRideCard("Best Move", recommendations.bestMove),
    formatRideCard("Smart Backup", recommendations.backup),
    formatRideCard("Worth the Walk", recommendations.worthTheWalk),
    formatRideCard("Plan Ahead", recommendations.planAhead),
    formatRideCard("Wait On This", recommendations.waitOnThis),
    "",
    `Completed ride IDs: ${completedRideIds.slice(0, 25).join(", ") || "none"}`,
    completedActivityContext ? `Completed activity today: ${completedActivityContext}` : null,
    `Skipped ride IDs: ${skippedRideIds.slice(0, 25).join(", ") || "none"}`,
    `Reported ride issue IDs: ${reportedRideIssueIds.slice(0, 25).join(", ") || "none"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function stripMarkdown(text = "") {
  return String(text || "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^---+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isShortMomentQuestion(message = "") {
  const text = String(message || "").toLowerCase();

  return (
    text.includes("what should we do next") ||
    text.includes("what do we do next") ||
    text.includes("what next") ||
    text.includes("next move") ||
    text.includes("based on our plan") ||
    text.includes("is now a good time") ||
    text.includes("should we do") ||
    text.includes("where should we go")
  );
}

function enforceBriefNextMoveReply(reply = "", message = "") {
  const cleaned = typeof stripMarkdown === "function" ? stripMarkdown(reply) : String(reply || "").trim();

  const isNextMove =
    typeof isShortMomentQuestion === "function"
      ? isShortMomentQuestion(message)
      : /what should we do next|what do we do next|what next|next move|based on our plan|where should we go|is now a good time|should we do/i.test(
          String(message || "")
        );

  if (!isNextMove) {
    return cleaned;
  }

  const compacted = cleaned
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^---+$/gm, "")
    .replace(/\bOption\s+\d+\s*:/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!compacted) return "";

  const sentences = compacted
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length) {
    return sentences
      .slice(0, 2)
      .map((sentence) => (sentence.length > 210 ? `${sentence.slice(0, 207).trim()}...` : sentence))
      .join(" ");
  }

  return compacted.length > 300 ? `${compacted.slice(0, 297).trim()}...` : compacted;
}


function isPlanningModeQuestion(message = "") {
  const text = String(message || "").toLowerCase();

  return (
    text.includes("full game plan") ||
    text.includes("gameplan") ||
    text.includes("game plan") ||
    text.includes("plan the rest of") ||
    text.includes("rest of our day") ||
    text.includes("full plan") ||
    text.includes("build a plan") ||
    text.includes("build me a plan") ||
    text.includes("compare") ||
    text.includes("tradeoff") ||
    text.includes("trade off") ||
    text.includes("explain why") ||
    text.includes("why is") ||
    text.includes("why does") ||
    text.includes("why are") ||
    text.includes("walk me through") ||
    text.includes("strategy for the day") ||
    text.includes("morning strategy") ||
    text.includes("evening strategy")
  );
}

function getAnswerMode(message = "") {
  return isPlanningModeQuestion(message) ? "planning" : "live";
}

function isScheduleContextQuestion(message = "") {
  const text = String(message || "").toLowerCase();

  return (
    text.includes("schedule") ||
    text.includes("plan say") ||
    text.includes("plan says") ||
    text.includes("plan changed") ||
    text.includes("plan change")
  );
}

function isFireworksViewingQuestion(message = "") {
  const text = String(message || "").toLowerCase();

  return (
    (text.includes("fireworks") || text.includes("firworks")) &&
    (
      text.includes("spot") ||
      text.includes("view") ||
      text.includes("watch") ||
      text.includes("where") ||
      text.includes("good place") ||
      text.includes("best place")
    )
  );
}

function isGenericLivePreamble(sentence = "") {
  const value = String(sentence || "").trim().toLowerCase();

  return (
    value.startsWith("hey") ||
    value.startsWith("based on") ||
    value.startsWith("i see") ||
    value.startsWith("you're in") ||
    value.startsWith("you are in") ||
    value.startsWith("this is") ||
    value.startsWith("right now") ||
    value.startsWith("quick reality check") ||
    value.startsWith("since ") ||
    value.includes("saved schedule") ||
    value.includes("park-day schedule") ||
    value.includes("profile fallback") ||
    value.includes("no scheduled park") ||
    value.includes("prime time to protect") ||
    (value.includes("afternoon crash window") && !/\b(head|go|ride|skip|stay|grab|use|do|take)\b/.test(value))
  );
}

function getFirstSentences(text = "", maxSentences = 2) {
  const cleaned = String(text || "")
    .replace(/\bU\.\s*S\.\s*A\./gi, "USA")
    .replace(/\bU\.\s*S\./gi, "US")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";

  const sentences = cleaned.match(/[^.!?]+[.!?]+/g);

  if (sentences?.length) {
    const usefulSentences = sentences.filter((sentence, index) => {
      if (index > 0) return true;
      return !isGenericLivePreamble(sentence);
    });

    return (usefulSentences.length ? usefulSentences : sentences)
      .slice(0, maxSentences)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return cleaned;
}

function finalizeAIReply(reply = "", message = "") {
  const cleaned = typeof stripMarkdown === "function" ? stripMarkdown(reply) : String(reply || "").trim();

  if (getAnswerMode(message) === "live" && isFireworksViewingQuestion(message)) {
    return getFirstSentences(cleaned, 5);
  }

  if (getAnswerMode(message) === "live" && !isScheduleContextQuestion(message)) {
    return getFirstSentences(cleaned, 2);
  }

  return cleaned;
}


function hasSpecificRidePlaceOrAction(message = "") {
  const text = String(message || "").toLowerCase();

  const specificTerms = [
    "tron",
    "seven dwarfs",
    "mine train",
    "space mountain",
    "big thunder",
    "tiana",
    "haunted mansion",
    "peter pan",
    "jungle cruise",
    "pirates",
    "small world",
    "peoplemover",
    "carousel of progress",
    "buzz",
    "winnie",
    "pooh",
    "dumbo",
    "barnstormer",
    "guardians",
    "cosmic rewind",
    "remy",
    "ratatouille",
    "frozen",
    "soarin",
    "test track",
    "rise of the resistance",
    "slinky",
    "tower of terror",
    "rock n roller",
    "rock 'n'",
    "flight of passage",
    "safari",
    "everest",
    "festival of fantasy",
    "fireworks",
    "parade",
    "show",
    "restaurant",
    "quick service",
    "snack",
    "food",
    "eat",
    "lunch",
    "dinner",
    "resort break",
    "break",
    "leave",
    "stay",
    "wait",
    "line",
    "ride",
    "tomorrowland",
    "fantasyland",
    "frontierland",
    "adventureland",
    "liberty square",
    "main street",
    "epcot",
    "hollywood",
    "animal kingdom",
    "magic kingdom",
  ];

  return specificTerms.some((term) => text.includes(term));
}

function isOpenEndedStrategyQuestion(message = "") {
  const text = String(message || "").toLowerCase().trim();

  if (!text) return false;
  if (hasSpecificRidePlaceOrAction(text)) return false;

  return (
    text.includes("what should we do next") ||
    text.includes("what do we do next") ||
    text.includes("what next") ||
    text.includes("what's the call") ||
    text.includes("whats the call") ||
    text.includes("help us decide") ||
    text.includes("where should we go") ||
    text.includes("based on our plan") ||
    text.includes("not sure what to do") ||
    text === "thoughts?" ||
    text === "thoughts" ||
    text === "worth it?" ||
    text === "worth it"
  );
}

function assistantAskedClarifyingQuestion(conversationHistory = []) {
  const lastAssistant = [...(conversationHistory || [])]
    .reverse()
    .find((entry) => entry.role === "assistant");

  const content = String(lastAssistant?.content || "").toLowerCase();

  return (
    content.includes("energy right now") ||
    content.includes("still good for a ride") ||
    content.includes("starting to fade") ||
    content.includes("hungry") ||
    content.includes("needing a break") ||
    content.includes("holding up") ||
    content.includes("one more big ride") ||
    content.includes("winding down")
  );
}

function shouldAskLiveStateClarifyingQuestion(message = "", sessionData = {}) {
  if (!isOpenEndedStrategyQuestion(message)) return false;

  if (
    sessionData.liveStateClarificationPending === true ||
    assistantAskedClarifyingQuestion(sessionData.conversationHistory)
  ) {
    return false;
  }

  return true;
}

function getLiveStateClarifyingQuestion(sessionData = {}) {
  const familyProfile = sessionData.familyProfile || {};
  const hasYoungKids =
    familyProfile.hasSmallChildren ||
    familyProfile.hasUnder3 ||
    familyProfile.ageSummary?.under3Count > 0 ||
    familyProfile.ageSummary?.childCount > 0;

  if (hasYoungKids) {
    return "How are the little ones holding up — still good for a ride, or starting to fade?";
  }

  return "How's everyone's energy right now — still good for a ride, or starting to fade?";
}


async function getAIResponse(message, sessionData = {}) {
  const trimmedMessage = String(message || "").trim().slice(0, 500);
  const answerMode = getAnswerMode(trimmedMessage);
  const maxTokens = answerMode === "live" ? 200 : 650;

  logger.info(
    {
      messageLength: trimmedMessage.length,
      activePark: sessionData.activePark,
      planningPark: sessionData.planningPark,
      planningParkSource: sessionData.planningParkSource,
      scheduledPrimaryPark: sessionData.scheduledParkForToday?.parkId,
      scheduledSecondPark: sessionData.scheduledParkForToday?.secondaryParkId,
      hopperStatus: sessionData.parkHopperContext?.status,
      hopperSecondParkPriority: sessionData.parkHopperContext?.secondParkPriority,
      liveParkStatus: sessionData.liveParkContext?.status,
      liveParkMismatch: sessionData.liveParkContext?.isLiveParkMismatch,
      currentLand: sessionData.currentLand,
      currentActivityType:
        sessionData.currentActivityContext?.type || sessionData.currentActivity?.type,
      currentActivityRide:
        sessionData.currentActivityContext?.rideName ||
        sessionData.currentActivity?.rideName,
      locationType: sessionData.locationContext?.type,
      nearestAnchorName: sessionData.locationContext?.nearestAnchorName,
      locationConfidence: sessionData.locationContext?.confidence,
      elapsedMinutesInLine:
        sessionData.currentActivityContext?.elapsedMinutesInLine ??
        sessionData.currentActivity?.elapsedMinutesInLine,
      weatherMode: sessionData.weatherMode?.mode,
      timePlanningMode: sessionData.timeContext?.planningMode,
      timeDayPhase: sessionData.timeContext?.dayPhase,
      tripStatus: sessionData.timeContext?.tripStatus?.status,
      familyProfileComplete: sessionData.familyProfile?.isSetupComplete,
      familyPlanningMode: sessionData.familyProfile?.planningPreferences?.planningMode,
      chatResponseMode: sessionData.chatResponseMode,
      chatFieldTestIntent: sessionData.chatFieldTestIntent,
      activeLandLabel: sessionData.activeLandLabel,
      latestFamilyStateEnergy:
        sessionData.latestFamilyState?.energy || sessionData.liveFamilyState?.energy,
      latestFamilyStateIntent:
        sessionData.latestFamilyState?.intent || sessionData.liveFamilyState?.intent,
      latestFamilyStateNeeds:
        sessionData.latestFamilyState?.needs || sessionData.liveFamilyState?.needs,
      tripPlanStartStrategy: sessionData.tripPlan?.preferences?.startStrategy,
      tripPlanBreakPreference: sessionData.tripPlan?.preferences?.breakPreference,
      mustDoCount:
        sessionData.mustDoExperiences?.length ||
        sessionData.tripPlan?.mustDoExperiences?.length ||
        0,
      dayGamePlanCount: Array.isArray(sessionData.dayGamePlan)
        ? sessionData.dayGamePlan.length
        : 0,
      resortName:
        sessionData.familyProfile?.resortProfile?.name ||
        sessionData.familyProfile?.resortContext?.resortName,
      answerMode,
      model: ANTHROPIC_MODEL,
    },
    "AI chat request"
  );

  if (isClearlyOffTopic(trimmedMessage)) {
    logger.info(
      {
        messageLength: trimmedMessage.length,
        reason: "off_topic_guardrail",
      },
      "AI chat blocked off-topic request"
    );

    return OFF_TOPIC_REPLY;
  }

  if (shouldAskLiveStateClarifyingQuestion(trimmedMessage, sessionData)) {
    logger.info(
      {
        messageLength: trimmedMessage.length,
        reason: "live_state_clarifying_question",
        activePark: sessionData.activePark,
      },
      "AI chat asked live-state clarifying question"
    );

    return getLiveStateClarifyingQuestion(sessionData);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return "AI chat is not configured yet, but I can still help with park data, weather, and planning basics.";
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const dynamicContext = buildDynamicContext({ ...sessionData, message: trimmedMessage });
  const history = summarizeHistory(sessionData.conversationHistory || []);

  const response = await Promise.race([
    anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      temperature: 0.35,
      system: STATIC_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Current TOHI app context:\n${dynamicContext}`,
        },
        ...history,
        {
          role: "user",
          content: `User question: ${trimmedMessage}

Answer mode: ${answerMode}. If answer mode is live, answer in 1–2 complete sentences with one recommendation only, except Magic Kingdom fireworks viewing-location questions may use 3–5 warm, practical sentences with reasons and caveats for stairs, strollers, wheelchairs, access changes, and Cast Member direction. Do not mention schedule fallback, missing schedule, or profile fallback unless the user asked why the plan changed. If answer mode is planning, you may give more detail but still avoid markdown.`,
        },
      ],
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI chat request timed out")), 13000)
    ),
  ]);

  const rawReply = response.content?.[0]?.text || "I had trouble creating a response. Try again.";
  return finalizeAIReply(rawReply, trimmedMessage);
}

module.exports = { getAIResponse };
