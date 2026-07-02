import { useCallback, useEffect, useMemo, useState } from "react";
import { getMiniGameForContext } from "../data/miniGames/magicKingdomMiniGames";

function getMiniGameSeedPart(value) {
  if (!value) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return (
    value.id ||
    value.rideId ||
    value.parkId ||
    value.name ||
    value.title ||
    ""
  );
}

function getStableMiniGameSeed(value = "") {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function buildMiniGameContextSeed({ activePark, currentActivity, currentLand }) {
  const now = new Date();
  const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  return getStableMiniGameSeed(
    [
      dayKey,
      getMiniGameSeedPart(activePark),
      getMiniGameSeedPart(currentActivity),
      getMiniGameSeedPart(currentLand),
    ]
      .filter(Boolean)
      .join("|"),
  );
}


export function useMiniGames({
  activePark,
  currentLand,
  currentActivity,
  trackAppEvent,
}) {
  const [activeMiniGameType, setActiveMiniGameType] = useState("trivia");
  const [miniGameSeedsByType, setMiniGameSeedsByType] = useState({});
  const miniGameSeed = miniGameSeedsByType[activeMiniGameType] ?? 0;
  const miniGameContextSeed = useMemo(
    () => buildMiniGameContextSeed({ activePark, currentActivity, currentLand }),
    [activePark, currentActivity, currentLand],
  );
  const [revealedTriviaAnswer, setRevealedTriviaAnswer] = useState(false);
  const [selectedTriviaChoice, setSelectedTriviaChoice] = useState("");
  const [selectedFamilyVoteOption, setSelectedFamilyVoteOption] = useState("");
  const [lookAroundFound, setLookAroundFound] = useState(false);
  const [celebrationPieces, setCelebrationPieces] = useState([]);

  const activeMiniGame = useMemo(() => {
    if (currentActivity?.type !== "in_line") return null;

    return getMiniGameForContext({
      parkId: activePark,
      land: currentActivity.land || currentLand,
      rideName: currentActivity.rideName,
      gameType: activeMiniGameType,
      seed: miniGameContextSeed + miniGameSeed,
    });
  }, [
    activePark,
    activeMiniGameType,
    currentActivity,
    currentLand,
    miniGameContextSeed,
    miniGameSeed,
  ]);

  const resetMiniGameInteractionState = useCallback(() => {
    setRevealedTriviaAnswer(false);
    setSelectedTriviaChoice("");
    setSelectedFamilyVoteOption("");
    setLookAroundFound(false);
  }, []);

  const triggerMiniCelebration = useCallback(() => {
    const shapes = ["🎉", "✨", "🎈", "⭐", "💫"];
    const pieces = Array.from({ length: 34 }, (_, index) => ({
      id: `${Date.now()}_${index}`,
      left: 6 + Math.random() * 88,
      drift: -150 + Math.random() * 300,
      delay: Math.random() * 260,
      size: 15 + Math.random() * 24,
      shape: shapes[index % shapes.length],
      rotate: -90 + Math.random() * 180,
    }));

    setCelebrationPieces(pieces);
  }, []);

  useEffect(() => {
    if (!celebrationPieces.length) return undefined;

    const timeoutId = setTimeout(() => {
      setCelebrationPieces([]);
    }, 1900);

    return () => clearTimeout(timeoutId);
  }, [celebrationPieces]);

  useEffect(() => {
    resetMiniGameInteractionState();
  }, [activeMiniGame?.title, activeMiniGameType, currentActivity?.rideId, resetMiniGameInteractionState]);

  const handleTriviaChoice = useCallback(
    (choice) => {
      if (!activeMiniGame || revealedTriviaAnswer) return;

      const isCorrect = choice === activeMiniGame.answer;

      setSelectedTriviaChoice(choice);
      setRevealedTriviaAnswer(true);

      trackAppEvent("mini_game_trivia_answered", {
        source: "while_you_wait",
        action: {
          type: isCorrect ? "correct_answer" : "wrong_answer",
          label: choice,
        },
        metadata: {
          rideName: currentActivity?.rideName,
          gameTitle: activeMiniGame.title,
          selectedChoice: choice,
          correctAnswer: activeMiniGame.answer,
          isCorrect,
        },
      });

      if (isCorrect) {
        triggerMiniCelebration();
      }
    },
    [
      activeMiniGame,
      currentActivity?.rideName,
      revealedTriviaAnswer,
      trackAppEvent,
      triggerMiniCelebration,
    ]
  );

  const handleFamilyVote = useCallback(
    (option) => {
      setSelectedFamilyVoteOption(option);

      trackAppEvent("mini_game_family_vote_selected", {
        source: "while_you_wait",
        action: {
          type: "family_vote",
          label: option,
        },
        metadata: {
          rideName: currentActivity?.rideName,
          gameTitle: activeMiniGame?.title,
        },
      });
    },
    [activeMiniGame?.title, currentActivity?.rideName, trackAppEvent]
  );

  const handleLookAroundFound = useCallback(() => {
    setLookAroundFound(true);
    triggerMiniCelebration();

    trackAppEvent("mini_game_lookaround_found", {
      source: "while_you_wait",
      action: {
        type: "found_it",
        label: "Found it",
      },
      metadata: {
        rideName: currentActivity?.rideName,
        gameTitle: activeMiniGame?.title,
      },
    });
  }, [
    activeMiniGame?.title,
    currentActivity?.rideName,
    trackAppEvent,
    triggerMiniCelebration,
  ]);

  const handleMiniGameTypeChange = useCallback(
    (type) => {
      setActiveMiniGameType(type);
      resetMiniGameInteractionState();
    },
    [resetMiniGameInteractionState]
  );

  const handleNextMiniGame = useCallback(() => {
    setMiniGameSeedsByType((prev) => ({
      ...prev,
      [activeMiniGameType]: (prev[activeMiniGameType] ?? 0) + 1,
    }));
    resetMiniGameInteractionState();
  }, [activeMiniGameType, resetMiniGameInteractionState]);

  const showTriviaAnswer = useCallback(() => {
    setRevealedTriviaAnswer(true);
    setSelectedTriviaChoice("");
  }, []);

  return {
    activeMiniGame,
    activeMiniGameType,
    revealedTriviaAnswer,
    selectedTriviaChoice,
    selectedFamilyVoteOption,
    lookAroundFound,
    celebrationPieces,
    handleMiniGameTypeChange,
    handleTriviaChoice,
    handleLookAroundFound,
    handleFamilyVote,
    handleNextMiniGame,
    showTriviaAnswer,
  };
}

export default useMiniGames;
