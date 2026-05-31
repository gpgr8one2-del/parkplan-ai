import React from "react";
import { MINI_GAME_TYPES } from "../data/miniGames/magicKingdomMiniGames";

function LineTimeCompanion({
  activeMiniGame,
  activeMiniGameType,
  revealedTriviaAnswer,
  selectedTriviaChoice,
  selectedFamilyVoteOption,
  lookAroundFound,
  handleMiniGameTypeChange,
  handleTriviaChoice,
  handleLookAroundFound,
  handleFamilyVote,
  handleNextMiniGame,
  showTriviaAnswer,
  button,
  actionButton,
}) {
  if (!activeMiniGame) return null;

  return (
    <div
      style={{
        marginTop: 14,
        padding: 12,
        borderRadius: 18,
        border: "1px solid #c4b5fd",
        background: "#faf5ff",
      }}
    >
      <div style={{ fontSize: 12, color: "#6d28d9", fontWeight: 900 }}>
        LINE TIME COMPANION
      </div>

      <h4 style={{ margin: "5px 0 6px", fontSize: 18 }}>
        A quick family game while you wait
      </h4>

      <p style={{ margin: "0 0 10px", color: "#475569", fontSize: 13 }}>
        No scores. No pressure. Just a tiny way to laugh, look around, and make the line feel shorter.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {MINI_GAME_TYPES.map((game) => (
          <button
            key={game.key}
            type="button"
            onClick={() => handleMiniGameTypeChange(game.key)}
            style={{
              ...actionButton,
              background: activeMiniGameType === game.key ? "#6d28d9" : "white",
              color: activeMiniGameType === game.key ? "white" : "#6d28d9",
              borderColor: "#c4b5fd",
            }}
          >
            {game.label}
          </button>
        ))}
      </div>

      <div
        style={{
          padding: 12,
          borderRadius: 16,
          border: "1px solid #ddd6fe",
          background: "white",
        }}
      >
        <strong>{activeMiniGame.title}</strong>

        {activeMiniGame.type === "trivia" && (
          <>
            <p style={{ margin: "8px 0", color: "#334155", fontWeight: 700 }}>
              {activeMiniGame.question}
            </p>

            <div style={{ display: "grid", gap: 8 }}>
              {activeMiniGame.choices.map((choice) => {
                const isCorrect = choice === activeMiniGame.answer;

                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => handleTriviaChoice(choice)}
                    disabled={revealedTriviaAnswer}
                    style={{
                      ...button,
                      borderRadius: 14,
                      textAlign: "left",
                      background:
                        revealedTriviaAnswer && isCorrect
                          ? "#dcfce7"
                          : revealedTriviaAnswer && selectedTriviaChoice === choice
                          ? "#fee2e2"
                          : "white",
                      borderColor:
                        revealedTriviaAnswer && isCorrect
                          ? "#86efac"
                          : revealedTriviaAnswer && selectedTriviaChoice === choice
                          ? "#fecaca"
                          : "#e2e8f0",
                      color:
                        revealedTriviaAnswer && isCorrect
                          ? "#166534"
                          : revealedTriviaAnswer && selectedTriviaChoice === choice
                          ? "#991b1b"
                          : "#0f172a",
                      opacity:
                        revealedTriviaAnswer && !isCorrect && selectedTriviaChoice !== choice
                          ? 0.72
                          : 1,
                    }}
                  >
                    {choice}
                    {revealedTriviaAnswer && isCorrect ? "  ✓" : ""}
                    {revealedTriviaAnswer && selectedTriviaChoice === choice && !isCorrect
                      ? "  ✕"
                      : ""}
                  </button>
                );
              })}
            </div>

            {!revealedTriviaAnswer ? (
              <button
                type="button"
                onClick={showTriviaAnswer}
                style={{ ...button, marginTop: 10, color: "#6d28d9" }}
              >
                Show Answer
              </button>
            ) : (
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 14,
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                }}
              >
                <strong
                  style={{
                    color:
                      selectedTriviaChoice &&
                      selectedTriviaChoice !== activeMiniGame.answer
                        ? "#991b1b"
                        : "#166534",
                  }}
                >
                  {selectedTriviaChoice
                    ? selectedTriviaChoice === activeMiniGame.answer
                      ? "Correct!"
                      : "Good guess!"
                    : "Answer"}{" "}
                  {selectedTriviaChoice && selectedTriviaChoice !== activeMiniGame.answer
                    ? `The answer is ${activeMiniGame.answer}.`
                    : activeMiniGame.answer}
                </strong>

                <p style={{ margin: "6px 0 0", color: "#334155" }}>
                  {activeMiniGame.fact}
                </p>
              </div>
            )}
          </>
        )}

        {activeMiniGame.type === "look_around" && (
          <>
            <p style={{ margin: "8px 0", color: "#334155", fontWeight: 700 }}>
              {activeMiniGame.task}
            </p>

            <p style={{ margin: "0 0 10px", color: "#64748b" }}>
              Hint: {activeMiniGame.hint}
            </p>

            <button
              type="button"
              onClick={handleLookAroundFound}
              style={{
                ...button,
                color: lookAroundFound ? "#166534" : "#0f172a",
                background: lookAroundFound ? "#dcfce7" : "white",
                borderColor: lookAroundFound ? "#86efac" : "#e2e8f0",
              }}
            >
              {lookAroundFound ? "Nice find! ✓" : "Found it!"}
            </button>
          </>
        )}

        {activeMiniGame.type === "family_vote" && (
          <>
            <p style={{ margin: "8px 0", color: "#334155", fontWeight: 700 }}>
              {activeMiniGame.prompt}
            </p>

            <div style={{ display: "grid", gap: 8 }}>
              {activeMiniGame.options.map((option) => {
                const selected = selectedFamilyVoteOption === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleFamilyVote(option)}
                    style={{
                      ...button,
                      borderRadius: 14,
                      textAlign: "left",
                      background: selected ? "#ede9fe" : "white",
                      borderColor: selected ? "#c4b5fd" : "#e2e8f0",
                      color: selected ? "#5b21b6" : "#0f172a",
                    }}
                  >
                    {option}
                    {selected ? "  ✓" : ""}
                  </button>
                );
              })}
            </div>

            {selectedFamilyVoteOption && (
              <p
                style={{
                  margin: "8px 0 0",
                  color: "#5b21b6",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Vote locked in: {selectedFamilyVoteOption}
              </p>
            )}
          </>
        )}

        {activeMiniGame.type === "would_you_rather" && (
          <p style={{ margin: "8px 0", color: "#334155", fontWeight: 800 }}>
            {activeMiniGame.prompt}
          </p>
        )}

        <button
          type="button"
          onClick={handleNextMiniGame}
          style={{ ...button, marginTop: 12, color: "#6d28d9" }}
        >
          Give us another one
        </button>
      </div>
    </div>
  );
}

export function WhileYouWaitCard({
  whileYouWaitContent,
  activeMiniGame,
  activeMiniGameType,
  revealedTriviaAnswer,
  selectedTriviaChoice,
  selectedFamilyVoteOption,
  lookAroundFound,
  handleMiniGameTypeChange,
  handleTriviaChoice,
  handleLookAroundFound,
  handleFamilyVote,
  handleNextMiniGame,
  showTriviaAnswer,
  card,
  button,
  actionButton,
}) {
  const items = whileYouWaitContent?.whileWaiting || [];

  if (!items.length) {
    return null;
  }

  return (
    <section
      style={{
        ...card,
        border: "1px solid #bfdbfe",
        background: "#eff6ff",
      }}
    >
      <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 900 }}>
        WHILE YOU WAIT
      </div>

      <h3 style={{ margin: "5px 0 10px", fontSize: 20 }}>
        Little details to make the line better
      </h3>

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item, idx) => (
          <div
            key={`${item.title}-${idx}`}
            style={{
              padding: 12,
              borderRadius: 16,
              border: "1px solid #dbeafe",
              background: "rgba(255,255,255,.75)",
            }}
          >
            <strong>{item.title}</strong>
            <p style={{ margin: "6px 0 0", color: "#334155" }}>
              {item.text}
            </p>
          </div>
        ))}
      </div>

      <LineTimeCompanion
        activeMiniGame={activeMiniGame}
        activeMiniGameType={activeMiniGameType}
        revealedTriviaAnswer={revealedTriviaAnswer}
        selectedTriviaChoice={selectedTriviaChoice}
        selectedFamilyVoteOption={selectedFamilyVoteOption}
        lookAroundFound={lookAroundFound}
        handleMiniGameTypeChange={handleMiniGameTypeChange}
        handleTriviaChoice={handleTriviaChoice}
        handleLookAroundFound={handleLookAroundFound}
        handleFamilyVote={handleFamilyVote}
        handleNextMiniGame={handleNextMiniGame}
        showTriviaAnswer={showTriviaAnswer}
        button={button}
        actionButton={actionButton}
      />
    </section>
  );
}

export default WhileYouWaitCard;
