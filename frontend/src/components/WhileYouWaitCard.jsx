import React from "react";
import { MINI_GAME_TYPES } from "../data/miniGames/magicKingdomMiniGames";
import { colors } from "../theme";

function LineTimeCompanion({
  activeMiniGame,
  activeMiniGameType,
  revealedTriviaAnswer,
  selectedTriviaChoice,
  selectedFamilyVoteOption,
  lookAroundFound,
  handleMiniGameTypeChange,
  handleTriviaChoice,
  handleTriviaSuccess,
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
        marginTop: 16,
        padding: 14,
        borderRadius: 24,
        border: "1px solid rgba(124, 58, 237, 0.22)",
        background:
          "radial-gradient(circle at 92% 8%, rgba(124, 58, 237, 0.18) 0%, rgba(124, 58, 237, 0.04) 36%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #F3E8FF 100%)",
        boxShadow: "0 14px 34px rgba(124, 58, 237, 0.10)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 94,
          height: 94,
          borderRadius: "999px",
          right: -34,
          bottom: -42,
          background: "rgba(245, 158, 11, 0.16)",
        }}
      />

      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 9px",
            borderRadius: 999,
            background: "rgba(124, 58, 237, 0.12)",
            color: colors.purpleDeep,
            fontSize: 11,
            fontWeight: 950,
            letterSpacing: 0.7,
            marginBottom: 8,
          }}
        >
          🎈 LINE TIME COMPANION
        </div>

        <h4
          style={{
            margin: "0 0 6px",
            fontSize: 21,
            color: colors.text,
            letterSpacing: -0.35,
            lineHeight: 1.15,
          }}
        >
          A quick family game while you wait
        </h4>

        <p
          style={{
            margin: "0 0 12px",
            color: colors.muted,
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          No scores. No pressure. Just a tiny way to laugh, look around, and
          make the line feel shorter.
        </p>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 13,
          }}
        >
          {MINI_GAME_TYPES.map((game) => {
            const isActive = activeMiniGameType === game.key;

            return (
              <button
                key={game.key}
                type="button"
                onClick={() => handleMiniGameTypeChange(game.key)}
                style={{
                  ...actionButton,
                  background: isActive
                    ? "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)"
                    : "rgba(255, 255, 255, 0.78)",
                  color: isActive ? "white" : colors.purpleDeep,
                  borderColor: isActive
                    ? "rgba(124, 58, 237, 0.28)"
                    : "rgba(124, 58, 237, 0.18)",
                  boxShadow: isActive
                    ? "0 10px 18px rgba(124, 58, 237, 0.18)"
                    : "0 6px 14px rgba(28, 25, 23, 0.04)",
                }}
              >
                {game.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            padding: 14,
            borderRadius: 22,
            border: `1px solid ${colors.cardBorder}`,
            background: "rgba(255, 255, 255, 0.86)",
            boxShadow: "0 10px 24px rgba(28, 25, 23, 0.06)",
          }}
        >
          <strong
            style={{
              display: "block",
              color: colors.text,
              fontSize: 16,
              lineHeight: 1.25,
            }}
          >
            {activeMiniGame.title}
          </strong>

          {activeMiniGame.type === "trivia" && (
            <>
              <p
                style={{
                  margin: "9px 0 10px",
                  color: colors.text,
                  fontWeight: 800,
                  lineHeight: 1.4,
                }}
              >
                {activeMiniGame.question}
              </p>

              {Array.isArray(activeMiniGame.choices) &&
                activeMiniGame.choices.length > 0 && (
                  <div style={{ display: "grid", gap: 8 }}>
                {activeMiniGame.choices.map((choice) => {
                  const isCorrect = choice === activeMiniGame.answer;
                  const isSelected = selectedTriviaChoice === choice;
                  const shouldShowCorrect = revealedTriviaAnswer && isCorrect;
                  const shouldShowWrong =
                    revealedTriviaAnswer && isSelected && !isCorrect;

                  return (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => handleTriviaChoice(choice)}
                      disabled={revealedTriviaAnswer}
                      style={{
                        ...button,
                        borderRadius: 16,
                        textAlign: "left",
                        padding: "10px 12px",
                        background: shouldShowCorrect
                          ? colors.successSoft
                          : shouldShowWrong
                          ? colors.errorSoft
                          : colors.card,
                        borderColor: shouldShowCorrect
                          ? "rgba(5, 150, 105, 0.28)"
                          : shouldShowWrong
                          ? "rgba(220, 38, 38, 0.25)"
                          : colors.cardBorder,
                        color: shouldShowCorrect
                          ? colors.success
                          : shouldShowWrong
                          ? colors.error
                          : colors.text,
                        opacity:
                          revealedTriviaAnswer && !isCorrect && !isSelected
                            ? 0.68
                            : 1,
                        boxShadow: shouldShowCorrect
                          ? "0 8px 18px rgba(5, 150, 105, 0.10)"
                          : shouldShowWrong
                          ? "0 8px 18px rgba(220, 38, 38, 0.08)"
                          : "0 6px 14px rgba(28, 25, 23, 0.04)",
                      }}
                    >
                      {choice}
                      {shouldShowCorrect ? "  ✓" : ""}
                      {shouldShowWrong ? "  ✕" : ""}
                    </button>
                  );
                })}
                  </div>
                )}

              {!revealedTriviaAnswer ? (
                <button
                  type="button"
                  onClick={showTriviaAnswer}
                  style={{
                    ...button,
                    marginTop: 11,
                    color: colors.purple,
                    borderColor: "rgba(124, 58, 237, 0.18)",
                  }}
                >
                  Show Answer
                </button>
              ) : (
                <div
                  style={{
                    marginTop: 11,
                    padding: 12,
                    borderRadius: 18,
                    background:
                      selectedTriviaChoice &&
                      selectedTriviaChoice !== activeMiniGame.answer
                        ? colors.errorSoft
                        : colors.successSoft,
                    border:
                      selectedTriviaChoice &&
                      selectedTriviaChoice !== activeMiniGame.answer
                        ? "1px solid rgba(220, 38, 38, 0.22)"
                        : "1px solid rgba(5, 150, 105, 0.22)",
                  }}
                >
                  <strong
                    style={{
                      color:
                        selectedTriviaChoice &&
                        selectedTriviaChoice !== activeMiniGame.answer
                          ? colors.error
                          : colors.success,
                    }}
                  >
                    {selectedTriviaChoice
                      ? selectedTriviaChoice === activeMiniGame.answer
                        ? "Correct!"
                        : "Good guess!"
                      : "Answer"}{" "}
                    {selectedTriviaChoice &&
                    selectedTriviaChoice !== activeMiniGame.answer
                      ? `The answer is ${activeMiniGame.answer}.`
                      : activeMiniGame.answer}
                  </strong>

                  {activeMiniGame.fact && (
                    <p style={{ margin: "6px 0 0", color: colors.text }}>
                      {activeMiniGame.fact}
                    </p>
                  )}

                  {(!Array.isArray(activeMiniGame.choices) ||
                    activeMiniGame.choices.length === 0) && (
                    <button
                      type="button"
                      onClick={handleTriviaSuccess}
                      disabled={selectedTriviaChoice === activeMiniGame.answer}
                      style={{
                        ...button,
                        marginTop: 11,
                        color:
                          selectedTriviaChoice === activeMiniGame.answer
                            ? colors.success
                            : colors.purple,
                        borderColor:
                          selectedTriviaChoice === activeMiniGame.answer
                            ? "rgba(5, 150, 105, 0.24)"
                            : "rgba(124, 58, 237, 0.18)",
                      }}
                    >
                      {selectedTriviaChoice === activeMiniGame.answer
                        ? "Nice — got it!"
                        : "We got it!"}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {activeMiniGame.type === "look_around" && (
            <>
              <p
                style={{
                  margin: "9px 0 8px",
                  color: colors.text,
                  fontWeight: 800,
                  lineHeight: 1.4,
                }}
              >
                {activeMiniGame.task}
              </p>

              <p
                style={{
                  margin: "0 0 11px",
                  color: colors.muted,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                Hint: {activeMiniGame.hint}
              </p>

              <button
                type="button"
                onClick={handleLookAroundFound}
                style={{
                  ...button,
                  color: lookAroundFound ? colors.success : colors.text,
                  background: lookAroundFound ? colors.successSoft : colors.card,
                  borderColor: lookAroundFound
                    ? "rgba(5, 150, 105, 0.28)"
                    : colors.cardBorder,
                }}
              >
                {lookAroundFound ? "Nice find! ✓" : "Found it!"}
              </button>
            </>
          )}

          {activeMiniGame.type === "family_vote" && (
            <>
              <p
                style={{
                  margin: "9px 0 10px",
                  color: colors.text,
                  fontWeight: 800,
                  lineHeight: 1.4,
                }}
              >
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
                        borderRadius: 16,
                        textAlign: "left",
                        padding: "10px 12px",
                        background: selected ? colors.purpleSoft : colors.card,
                        borderColor: selected
                          ? "rgba(124, 58, 237, 0.28)"
                          : colors.cardBorder,
                        color: selected ? colors.purpleDeep : colors.text,
                        boxShadow: selected
                          ? "0 8px 18px rgba(124, 58, 237, 0.10)"
                          : "0 6px 14px rgba(28, 25, 23, 0.04)",
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
                    margin: "9px 0 0",
                    color: colors.purpleDeep,
                    fontSize: 13,
                    fontWeight: 900,
                  }}
                >
                  Vote locked in: {selectedFamilyVoteOption}
                </p>
              )}
            </>
          )}

          {activeMiniGame.type === "would_you_rather" && (
            <p
              style={{
                margin: "9px 0 0",
                color: colors.text,
                fontWeight: 850,
                lineHeight: 1.45,
              }}
            >
              {activeMiniGame.prompt}
            </p>
          )}

          <button
            type="button"
            onClick={handleNextMiniGame}
            style={{
              ...button,
              marginTop: 13,
              color: colors.purple,
              borderColor: "rgba(124, 58, 237, 0.18)",
              background: "rgba(255, 255, 255, 0.82)",
            }}
          >
            Give us another one
          </button>
        </div>
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
  handleTriviaSuccess,
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
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(56, 189, 248, 0.26)",
        background:
          "radial-gradient(circle at 92% 0%, rgba(56, 189, 248, 0.18) 0%, rgba(56, 189, 248, 0.05) 34%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #E0F2FE 100%)",
        boxShadow: "0 16px 38px rgba(2, 132, 199, 0.10)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 112,
          height: 112,
          borderRadius: "999px",
          right: -44,
          top: -52,
          background: "rgba(124, 58, 237, 0.10)",
        }}
      />

      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 9px",
            borderRadius: 999,
            background: "rgba(56, 189, 248, 0.16)",
            color: "#0369A1",
            fontSize: 11,
            fontWeight: 950,
            letterSpacing: 0.7,
            marginBottom: 8,
          }}
        >
          ✨ WHILE YOU WAIT
        </div>

        <h3
          style={{
            margin: "0 0 8px",
            fontSize: 22,
            color: colors.text,
            letterSpacing: -0.4,
            lineHeight: 1.15,
          }}
        >
          Little details to make the line better
        </h3>

        <div style={{ display: "grid", gap: 10 }}>
          {items.map((item, idx) => (
            <div
              key={`${item.title}-${idx}`}
              style={{
                padding: 13,
                borderRadius: 18,
                border: `1px solid ${colors.cardBorder}`,
                background: "rgba(255, 255, 255, 0.82)",
                boxShadow: "0 8px 18px rgba(28, 25, 23, 0.04)",
              }}
            >
              <strong style={{ color: colors.text }}>{item.title}</strong>
              <p
                style={{
                  margin: "6px 0 0",
                  color: colors.muted,
                  lineHeight: 1.45,
                }}
              >
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
          handleTriviaSuccess={handleTriviaSuccess}
          handleLookAroundFound={handleLookAroundFound}
          handleFamilyVote={handleFamilyVote}
          handleNextMiniGame={handleNextMiniGame}
          showTriviaAnswer={showTriviaAnswer}
          button={button}
          actionButton={actionButton}
        />
      </div>
    </section>
  );
}

export default WhileYouWaitCard;
