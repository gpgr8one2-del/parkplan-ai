import React from "react";
import { CORE_GAME_TYPES } from "../data/miniGames/magicKingdomMiniGames";
import { colors } from "../theme";

// Day gradients preserved verbatim from the shipped values.
const DAY_COMPANION_BACKGROUND =
  "radial-gradient(circle at 92% 8%, rgba(124, 58, 237, 0.18) 0%, rgba(124, 58, 237, 0.04) 36%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #F3E8FF 100%)";
const DAY_OUTER_BACKGROUND =
  "radial-gradient(circle at 92% 0%, rgba(56, 189, 248, 0.18) 0%, rgba(56, 189, 248, 0.05) 34%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #E0F2FE 100%)";

// 62B-2F-1. Presentation tokens for the While You Wait surfaces. Day values are
// exactly what this card already shipped; night reuses the same Plan/Home
// palette. Behaviour, content, handlers and mini-game selection are untouched —
// only colours change. No pure black.
function getWywTokens(night) {
  return night
    ? {
        companionBorder: "1px solid rgba(139, 92, 246, 0.34)",
        companionBackground:
          "radial-gradient(circle at 92% 8%, rgba(139, 92, 246, 0.20) 0%, rgba(139, 92, 246, 0.06) 34%, transparent 60%), linear-gradient(150deg, #16203C 0%, #131C36 100%)",
        companionShadow: "0 14px 34px rgba(2, 6, 23, 0.50)",
        orbAmber: "rgba(245, 158, 11, 0.14)",
        orbPurple: "rgba(139, 92, 246, 0.18)",
        eyebrowPill: "rgba(76, 29, 149, 0.45)",
        eyebrow: "#C4B5FD",
        title: "#F5F3FF",
        muted: "#B6C2E2",
        innerSurface: "rgba(15, 23, 42, 0.72)",
        itemSurface: "rgba(15, 23, 42, 0.62)",
        itemShadow: "0 8px 18px rgba(2, 6, 23, 0.40)",
        innerBorder: "rgba(99, 102, 241, 0.26)",
        innerShadow: "0 10px 24px rgba(2, 6, 23, 0.45)",
        optionSurface: "rgba(30, 41, 59, 0.72)",
        optionBorder: "rgba(99, 102, 241, 0.26)",
        optionShadow: "0 6px 14px rgba(2, 6, 23, 0.45)",
        chipActiveBackground: "linear-gradient(145deg, #6D28D9 0%, #4C1D95 100%)",
        chipIdleBackground: "rgba(30, 41, 59, 0.72)",
        chipActiveBorder: "rgba(167, 139, 250, 0.42)",
        chipIdleBorder: "rgba(99, 102, 241, 0.26)",
        chipActiveShadow: "0 10px 18px rgba(2, 6, 23, 0.50)",
        chipIdleShadow: "0 6px 14px rgba(2, 6, 23, 0.40)",
        chipIdleText: "#C4B5FD",
        accent: "#C4B5FD",
        accentBorder: "rgba(139, 92, 246, 0.34)",
        successText: "#6EE7B7",
        successSurface: "rgba(6, 78, 59, 0.55)",
        successBorder: "rgba(52, 211, 153, 0.40)",
        successBorderSoft: "rgba(52, 211, 153, 0.34)",
        successShadow: "0 8px 18px rgba(2, 6, 23, 0.45)",
        errorText: "#FCA5A5",
        errorSurface: "rgba(69, 10, 10, 0.55)",
        errorBorder: "rgba(248, 113, 113, 0.38)",
        errorBorderSoft: "rgba(248, 113, 113, 0.32)",
        errorShadow: "0 8px 18px rgba(2, 6, 23, 0.45)",
        selectedSurface: "rgba(76, 29, 149, 0.45)",
        selectedBorder: "rgba(167, 139, 250, 0.42)",
        selectedText: "#DDD6FE",
        selectedShadow: "0 8px 18px rgba(2, 6, 23, 0.45)",
        promptSurface: "rgba(76, 29, 149, 0.28)",
        promptBorder: "1px solid rgba(139, 92, 246, 0.34)",
        controlSurface: "rgba(30, 41, 59, 0.78)",
        skyPill: "rgba(30, 58, 92, 0.62)",
        skyText: "#7DD3FC",
        outerBorder: "1px solid rgba(56, 189, 248, 0.26)",
        outerBackground:
          "radial-gradient(circle at 92% 0%, rgba(56, 189, 248, 0.14) 0%, rgba(56, 189, 248, 0.04) 34%, transparent 58%), linear-gradient(145deg, #131C36 0%, #16233F 100%)",
        outerShadow: "0 16px 38px rgba(2, 6, 23, 0.45)",
      }
    : {
        companionBorder: "1px solid rgba(124, 58, 237, 0.22)",
        companionBackground: DAY_COMPANION_BACKGROUND,
        companionShadow: "0 14px 34px rgba(124, 58, 237, 0.10)",
        orbAmber: "rgba(245, 158, 11, 0.16)",
        orbPurple: "rgba(124, 58, 237, 0.10)",
        eyebrowPill: "rgba(124, 58, 237, 0.12)",
        eyebrow: colors.purpleDeep,
        title: colors.text,
        muted: colors.muted,
        innerSurface: "rgba(255, 255, 255, 0.86)",
        itemSurface: "rgba(255, 255, 255, 0.82)",
        itemShadow: "0 8px 18px rgba(28, 25, 23, 0.04)",
        innerBorder: colors.cardBorder,
        innerShadow: "0 10px 24px rgba(28, 25, 23, 0.06)",
        optionSurface: colors.card,
        optionBorder: colors.cardBorder,
        optionShadow: "0 6px 14px rgba(28, 25, 23, 0.04)",
        chipActiveBackground: "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)",
        chipIdleBackground: "rgba(255, 255, 255, 0.78)",
        chipActiveBorder: "rgba(124, 58, 237, 0.28)",
        chipIdleBorder: "rgba(124, 58, 237, 0.18)",
        chipActiveShadow: "0 10px 18px rgba(124, 58, 237, 0.18)",
        chipIdleShadow: "0 6px 14px rgba(28, 25, 23, 0.04)",
        chipIdleText: colors.purpleDeep,
        accent: colors.purple,
        accentBorder: "rgba(124, 58, 237, 0.18)",
        successText: colors.success,
        successSurface: colors.successSoft,
        successBorder: "rgba(5, 150, 105, 0.28)",
        successBorderSoft: "rgba(5, 150, 105, 0.22)",
        successShadow: "0 8px 18px rgba(5, 150, 105, 0.10)",
        errorText: colors.error,
        errorSurface: colors.errorSoft,
        errorBorder: "rgba(220, 38, 38, 0.25)",
        errorBorderSoft: "rgba(220, 38, 38, 0.22)",
        errorShadow: "0 8px 18px rgba(220, 38, 38, 0.08)",
        selectedSurface: colors.purpleSoft,
        selectedBorder: "rgba(124, 58, 237, 0.28)",
        selectedText: colors.purpleDeep,
        selectedShadow: "0 8px 18px rgba(124, 58, 237, 0.10)",
        promptSurface: "rgba(124, 58, 237, 0.08)",
        promptBorder: "1px solid rgba(124, 58, 237, 0.18)",
        controlSurface: "rgba(255, 255, 255, 0.82)",
        skyPill: "rgba(56, 189, 248, 0.16)",
        skyText: "#0369A1",
        outerBorder: "1px solid rgba(56, 189, 248, 0.26)",
        outerBackground: DAY_OUTER_BACKGROUND,
        outerShadow: "0 16px 38px rgba(2, 132, 199, 0.10)",
      };
}

function LineTimeCompanion({
  night = false,
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
  const w = getWywTokens(night);

  if (!activeMiniGame) return null;

  return (
    <div
      style={{
        marginTop: 16,
        padding: 14,
        borderRadius: 24,
        border: w.companionBorder,
        background: w.companionBackground,
        boxShadow: w.companionShadow,
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
          background: w.orbAmber,
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
            background: w.eyebrowPill,
            color: w.eyebrow,
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
            color: w.title,
            letterSpacing: -0.35,
            lineHeight: 1.15,
          }}
        >
          A quick family game while you wait
        </h4>

        <p
          style={{
            margin: "0 0 12px",
            color: w.muted,
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
          {CORE_GAME_TYPES.map((game) => {
            const isActive = activeMiniGameType === game.key;

            return (
              <button
                key={game.key}
                type="button"
                onClick={() => handleMiniGameTypeChange(game.key)}
                style={{
                  ...actionButton,
                  background: isActive
                    ? w.chipActiveBackground
                    : w.chipIdleBackground,
                  color: isActive ? "white" : w.chipIdleText,
                  borderColor: isActive
                    ? w.chipActiveBorder
                    : w.chipIdleBorder,
                  boxShadow: isActive
                    ? w.chipActiveShadow
                    : w.chipIdleShadow,
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
            border: `1px solid ${w.innerBorder}`,
            background: w.innerSurface,
            boxShadow: w.innerShadow,
          }}
        >
          <strong
            style={{
              display: "block",
              color: w.title,
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
                  color: w.title,
                  fontWeight: 800,
                  lineHeight: 1.4,
                }}
              >
                {activeMiniGame.question}
              </p>

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
                          ? w.successSurface
                          : shouldShowWrong
                          ? w.errorSurface
                          : w.optionSurface,
                        borderColor: shouldShowCorrect
                          ? w.successBorder
                          : shouldShowWrong
                          ? w.errorBorder
                          : w.optionBorder,
                        color: shouldShowCorrect
                          ? w.successText
                          : shouldShowWrong
                          ? w.errorText
                          : w.title,
                        opacity:
                          revealedTriviaAnswer && !isCorrect && !isSelected
                            ? 0.68
                            : 1,
                        boxShadow: shouldShowCorrect
                          ? w.successShadow
                          : shouldShowWrong
                          ? w.errorShadow
                          : w.optionShadow,
                      }}
                    >
                      {choice}
                      {shouldShowCorrect ? "  ✓" : ""}
                      {shouldShowWrong ? "  ✕" : ""}
                    </button>
                  );
                })}
              </div>

              {!revealedTriviaAnswer ? (
                <button
                  type="button"
                  onClick={showTriviaAnswer}
                  style={{
                    ...button,
                    marginTop: 11,
                    color: w.accent,
                    borderColor: w.accentBorder,
                    ...(night ? { background: w.controlSurface } : null),
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
                        ? w.errorSurface
                        : w.successSurface,
                    border:
                      selectedTriviaChoice &&
                      selectedTriviaChoice !== activeMiniGame.answer
                        ? `1px solid ${w.errorBorderSoft}`
                        : `1px solid ${w.successBorderSoft}`,
                  }}
                >
                  <strong
                    style={{
                      color:
                        selectedTriviaChoice &&
                        selectedTriviaChoice !== activeMiniGame.answer
                          ? w.errorText
                          : w.successText,
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

                  <p style={{ margin: "6px 0 0", color: w.title }}>
                    {activeMiniGame.fact}
                  </p>
                </div>
              )}
            </>
          )}

          {activeMiniGame.type === "look_around" && (
            <>
              <p
                style={{
                  margin: "9px 0 8px",
                  color: w.title,
                  fontWeight: 800,
                  lineHeight: 1.4,
                }}
              >
                {activeMiniGame.task}
              </p>

              <p
                style={{
                  margin: "0 0 11px",
                  color: w.muted,
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
                  color: lookAroundFound ? w.successText : w.title,
                  background: lookAroundFound ? w.successSurface : w.optionSurface,
                  borderColor: lookAroundFound
                    ? w.successBorder
                    : w.optionBorder,
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
                color: w.title,
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
                        background: selected ? w.selectedSurface : w.optionSurface,
                        borderColor: selected
                          ? w.selectedBorder
                          : w.optionBorder,
                        color: selected ? w.selectedText : w.title,
                        boxShadow: selected
                          ? w.selectedShadow
                          : w.optionShadow,
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
                    color: w.selectedText,
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
                color: w.title,
                fontWeight: 850,
                lineHeight: 1.45,
              }}
            >
              {activeMiniGame.prompt}
            </p>
          )}

          {activeMiniGame.type === "conversation_starter" && (
            <p
              style={{
                margin: "9px 0 0",
                color: w.title,
                fontWeight: 850,
                lineHeight: 1.45,
              }}
            >
              {activeMiniGame.prompt}
            </p>
          )}

          {activeMiniGame.type === "queue_clues" && (
            <div>
              <p
                style={{
                  margin: "9px 0 12px",
                  color: w.title,
                  fontWeight: 850,
                  lineHeight: 1.45,
                }}
              >
                {activeMiniGame.prompt}
              </p>

              <div
                style={{
                  marginTop: 10,
                  padding: "22px 16px",
                  borderRadius: 22,
                  textAlign: "center",
                  background: w.promptSurface,
                  border: w.promptBorder,
                }}
              >
                <p
                  style={{
                    margin: "0 0 7px",
                    color: w.muted,
                    fontSize: 12,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  Guess this
                </p>
                <p
                  style={{
                    margin: 0,
                    color: w.eyebrow,
                    fontSize: 28,
                    fontWeight: 950,
                    lineHeight: 1.1,
                  }}
                >
                  {activeMiniGame.word}
                </p>
              </div>

              <p
                style={{
                  margin: "10px 0 0",
                  color: w.muted,
                  fontSize: 13,
                  lineHeight: 1.45,
                }}
              >
                Clue-givers: describe it, act it out, or point around the queue — just do not say the word.
              </p>
            </div>
          )}

          {activeMiniGame.type === "prediction_game" && (
            <p
              style={{
                margin: "9px 0 0",
                color: w.title,
                fontWeight: 850,
                lineHeight: 1.45,
              }}
            >
              {activeMiniGame.prompt}
            </p>
          )}

          {activeMiniGame.type === "family_challenge" && (
            <p
              style={{
                margin: "9px 0 0",
                color: w.title,
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
              color: w.accent,
              borderColor: w.accentBorder,
              background: w.controlSurface,
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
  night = false,
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
  const w = getWywTokens(night);

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
        border: w.outerBorder,
        background: w.outerBackground,
        boxShadow: w.outerShadow,
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
          background: w.orbPurple,
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
            background: w.skyPill,
            color: w.skyText,
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
            color: w.title,
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
                border: `1px solid ${w.innerBorder}`,
                background: w.itemSurface,
                boxShadow: w.itemShadow,
              }}
            >
              <strong style={{ color: w.title }}>{item.title}</strong>
              <p
                style={{
                  margin: "6px 0 0",
                  color: w.muted,
                  lineHeight: 1.45,
                }}
              >
                {item.text}
              </p>
            </div>
          ))}
        </div>

        <LineTimeCompanion
          night={night}
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
      </div>
    </section>
  );
}

export default WhileYouWaitCard;
