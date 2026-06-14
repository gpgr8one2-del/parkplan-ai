import { useCallback, useEffect, useMemo, useState } from "react";
import { getMiniGameForContext } from "../data/miniGames/magicKingdomMiniGames";

export function useMiniGames({
  activePark,
  currentLand,
  currentActivity,
  trackAppEvent,
}) {
  const [activeMiniGameType, setActiveMiniGameType] = useState("trivia");
  const [miniGameSeed, setMiniGameSeed] = useState(0);
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
      seed: miniGameSeed,
    });
  }, [
    activePark,
    activeMiniGameType,
    currentActivity,
    currentLand,
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
      setMiniGameSeed(0);
      resetMiniGameInteractionState();
    },
    [resetMiniGameInteractionState]
  );

  const handleNextMiniGame = useCallback(() => {
    setMiniGameSeed((prev) => prev + 1);
    resetMiniGameInteractionState();
  }, [resetMiniGameInteractionState]);

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
