export function buildAccessState({
  profileCompletion,
  devPreviewFullApp,
  timeContext,
  devAllowFullAppWithoutProfile = false,
}) {
  const profileComplete = Boolean(profileCompletion?.isComplete);
  const isDevPreviewing = Boolean(
    devAllowFullAppWithoutProfile && devPreviewFullApp
  );
  const hasPersonalizedAccess = profileComplete || isDevPreviewing;
  const aiAllowedByTime = Boolean(timeContext?.aiAccess?.shouldAllowAi);

  const setupReason = profileComplete
    ? "Trip setup is complete."
    : "Finish trip setup to unlock personalized guidance.";

  const aiLockedReason = !hasPersonalizedAccess
    ? "Finish trip setup before using AI guidance."
    : !aiAllowedByTime && !isDevPreviewing
    ? timeContext?.aiAccess?.reason ||
      "AI guidance is not available for this trip timing yet."
    : "AI guidance is available.";

  return {
    plan: isDevPreviewing ? "dev_preview" : profileComplete ? "personalized" : "basic",
    isDevPreviewing,
    profileComplete,

    canViewWaitTimes: true,
    canUseRecommendations: hasPersonalizedAccess,
    canUseAiChat: isDevPreviewing || (hasPersonalizedAccess && aiAllowedByTime),
    canUseMiniGames: true,
    canUseDayOfGuidance: hasPersonalizedAccess,

    setupReason,
    recommendationLockedReason: setupReason,
    aiLockedReason,
  };
}
