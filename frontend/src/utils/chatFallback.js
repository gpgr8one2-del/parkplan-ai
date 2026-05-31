export function buildLocalChatFallback({
  activePark,
  weatherMode,
  currentActivityContext,
  familyProfile,
  recommendations = {},
}) {
  const bestMove = recommendations.bestMove;
  const backup = recommendations.backup;
  const planAhead = recommendations.planAhead;

  const resortName =
    familyProfile?.resortProfile?.name ||
    familyProfile?.resortContext?.resortName ||
    familyProfile?.resortContext?.offPropertyHotelName ||
    "";

  const breakStrategy =
    familyProfile?.resortProfile?.breakStrategy?.[activePark] || "";

  const directAccess =
    familyProfile?.resortProfile?.directAccess?.[activePark] || [];

  const lines = [
    "TOHI Offline Help",
    "",
    "I’m having trouble reaching AI chat right now, so I do not want to pretend I fully understood the question.",
    "",
    "Here is the safest read from the live app engine right now:",
  ];

  if (currentActivityContext?.type === "in_line") {
    const elapsed = currentActivityContext.elapsedMinutesInLine;
    const posted = currentActivityContext.postedWaitAtStart;

    lines.push(
      "",
      `Current status: You are marked in line for ${currentActivityContext.rideName || "a ride"}${
        posted != null ? `, with a ${posted}-minute posted wait when you joined` : ""
      }${elapsed != null ? `, and about ${elapsed} minutes elapsed` : ""}.`
    );
  }

  if (bestMove?.name) {
    lines.push(
      "",
      `Best Move showing now: ${bestMove.name}${
        bestMove.waitTime != null ? ` (${bestMove.waitTime} min)` : ""
      }.`
    );
  } else if (backup?.name) {
    lines.push(
      "",
      `Smart Backup showing now: ${backup.name}${
        backup.waitTime != null ? ` (${backup.waitTime} min)` : ""
      }.`
    );
  } else {
    lines.push(
      "",
      "No strong ride move is showing right now. That usually means this is a good moment to reset instead of forcing the next attraction."
    );
  }

  if (planAhead?.name) {
    lines.push(
      `Plan Ahead note: keep ${planAhead.name} on your radar${
        planAhead.waitTime != null ? `; current posted wait is ${planAhead.waitTime} min` : ""
      }.`
    );
  }

  if (breakStrategy) {
    lines.push("", `Resort break guidance for ${resortName || "your resort"}: ${breakStrategy}`);
  } else if (resortName) {
    lines.push(
      "",
      `Resort break guidance: ${resortName} is your selected resort. If the family is fading, only leave the park if transportation is realistic and you can protect enough return time.`
    );
  } else {
    lines.push(
      "",
      "Pacing guidance: if the family is tired, choose shade, AC, water, food, or a quiet seated reset before chasing another far ride."
    );
  }

  if (directAccess.length) {
    lines.push(`Known direct access from this park: ${directAccess.join(", ")}.`);
  }

  if (weatherMode?.mode && weatherMode.mode !== "normal") {
    lines.push(
      "",
      `Weather mode is active: ${weatherMode.label || weatherMode.mode}. Favor indoor, shaded, or low-walking choices until conditions improve.`
    );
  }

  lines.push("", "Try sending your message again in a minute once the signal improves.");

  return lines.join("\n");
}
