import React from "react";
import { colors } from "../theme";

export function PlanTab({
  card,
  button,
  hasPersonalizedAccess,
  profileCompletion,
  timeContext,
  packingChecklist,
  setActiveScreen,
}) {
  return (
    <>
              <section
                style={{
                  ...card,
                  position: "relative",
                  overflow: "hidden",
                  background:
                    "radial-gradient(circle at 92% 0%, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0.06) 34%, transparent 58%), linear-gradient(150deg, #FFFFFF 0%, #FFF7ED 48%, #FEF3C7 100%)",
                  border: "1px solid rgba(245, 158, 11, 0.24)",
                  borderRadius: 28,
                  boxShadow: "0 18px 44px rgba(245, 158, 11, 0.12)",
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
                    bottom: -48,
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
                      background: "rgba(245, 158, 11, 0.14)",
                      color: "#92400E",
                      fontSize: 11,
                      fontWeight: 950,
                      letterSpacing: 0.7,
                      marginBottom: 10,
                    }}
                  >
                    ✨ TRIP RHYTHM
                  </div>

                  <h2
                    style={{
                      margin: 0,
                      color: colors.text,
                      fontSize: 27,
                      letterSpacing: -0.6,
                      lineHeight: 1.15,
                    }}
                  >
                    Your calm trip plan
                  </h2>

                  <p
                    style={{
                      margin: "9px 0 0",
                      color: colors.muted,
                      fontSize: 14,
                      lineHeight: 1.5,
                      maxWidth: 620,
                    }}
                  >
                    Keep the day simple, realistic, and flexible. This is where TOHI
                    will help shape the trip before the park and protect family energy
                    once you are there.
                  </p>

                  <button
                    type="button"
                    onClick={() => setActiveScreen("family_profile")}
                    style={{
                      ...button,
                      marginTop: 15,
                      background:
                        "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)",
                      color: "white",
                      borderColor: "rgba(124, 58, 237, 0.28)",
                      boxShadow: "0 12px 24px rgba(124, 58, 237, 0.18)",
                    }}
                  >
                    {profileCompletion.isComplete ? "Review Trip Setup" : "Finish Trip Setup"}
                  </button>
                </div>
              </section>

              <section
                style={{
                  ...card,
                  background:
                    "linear-gradient(145deg, #FFFFFF 0%, #FFF9F1 100%)",
                  border: `1px solid ${colors.cardBorder}`,
                  boxShadow: "0 12px 30px rgba(28, 25, 23, 0.07)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: colors.amberSoft,
                    color: "#92400E",
                    fontSize: 11,
                    fontWeight: 950,
                    letterSpacing: 0.7,
                    marginBottom: 8,
                  }}
                >
                  PLANNING STATUS
                </div>

                <p
                  style={{
                    margin: 0,
                    color: colors.text,
                    fontWeight: 900,
                    fontSize: 16,
                    lineHeight: 1.4,
                  }}
                >
                  {timeContext.summary}
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 12,
                  }}
                >
                  <span
                    style={{
                      padding: "6px 9px",
                      borderRadius: 999,
                      background: colors.purpleSoft,
                      color: colors.purpleDeep,
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    Mode: {timeContext.planningMode.replace(/_/g, " ")}
                  </span>

                  <span
                    style={{
                      padding: "6px 9px",
                      borderRadius: 999,
                      background: hasPersonalizedAccess ? colors.successSoft : colors.coralSoft,
                      color: hasPersonalizedAccess ? colors.success : "#E11D48",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    AI: {hasPersonalizedAccess ? "available" : "locked"}
                  </span>
                </div>
              </section>

              <section
                style={{
                  ...card,
                  position: "relative",
                  overflow: "hidden",
                  background:
                    "radial-gradient(circle at 92% 0%, rgba(5, 150, 105, 0.16) 0%, rgba(5, 150, 105, 0.04) 34%, transparent 58%), linear-gradient(145deg, #FFFFFF 0%, #ECFDF5 100%)",
                  border: "1px solid rgba(5, 150, 105, 0.20)",
                  boxShadow: "0 14px 34px rgba(5, 150, 105, 0.08)",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    width: 112,
                    height: 112,
                    borderRadius: "999px",
                    right: -42,
                    top: -48,
                    background: "rgba(124, 58, 237, 0.09)",
                  }}
                />

                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 9px",
                          borderRadius: 999,
                          background: colors.successSoft,
                          color: colors.success,
                          fontSize: 11,
                          fontWeight: 950,
                          letterSpacing: 0.7,
                          marginBottom: 9,
                        }}
                      >
                        PACKING CHECKLIST
                      </div>

                      <h3
                        style={{
                          margin: 0,
                          color: colors.text,
                          fontSize: 24,
                          letterSpacing: -0.4,
                          lineHeight: 1.15,
                        }}
                      >
                        Bring the stuff that protects the day.
                      </h3>

                      <p
                        style={{
                          margin: "8px 0 0",
                          color: colors.muted,
                          fontSize: 13,
                          lineHeight: 1.45,
                          maxWidth: 620,
                        }}
                      >
                        This first Plan Ahead tool is deterministic: TOHI looks at your
                        family setup, comfort settings, weather, and park context without
                        making up a plan.
                      </p>
                    </div>

                    <span
                      style={{
                        padding: "7px 10px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.78)",
                        border: `1px solid ${colors.cardBorder}`,
                        color: colors.text,
                        fontSize: 12,
                        fontWeight: 900,
                      }}
                    >
                      {packingChecklist.length} items
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    {packingChecklist.map((item) => {
                      const priorityStyles = {
                        must: { label: "Must pack", bg: colors.coralSoft, color: "#E11D48" },
                        should: { label: "Should pack", bg: colors.amberSoft, color: "#92400E" },
                        nice_to_have: { label: "Nice to have", bg: colors.skySoft, color: "#0369A1" },
                      };

                      const styleForPriority =
                        priorityStyles[item.priority] || priorityStyles.nice_to_have;

                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: 13,
                            borderRadius: 18,
                            background: "rgba(255,255,255,0.82)",
                            border: `1px solid ${colors.cardBorder}`,
                            boxShadow: "0 8px 18px rgba(28, 25, 23, 0.04)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 10,
                            }}
                          >
                            <div>
                              <strong style={{ color: colors.text }}>{item.label}</strong>
                              <p
                                style={{
                                  margin: "5px 0 0",
                                  color: colors.muted,
                                  fontSize: 13,
                                  lineHeight: 1.4,
                                }}
                              >
                                {item.reason}
                              </p>
                            </div>

                            <span
                              style={{
                                flexShrink: 0,
                                padding: "5px 8px",
                                borderRadius: 999,
                                background: styleForPriority.bg,
                                color: styleForPriority.color,
                                fontSize: 11,
                                fontWeight: 950,
                              }}
                            >
                              {styleForPriority.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section
                style={{
                  ...card,
                  background:
                    "linear-gradient(145deg, #FFFFFF 0%, #F3E8FF 100%)",
                  border: "1px solid rgba(124, 58, 237, 0.18)",
                  boxShadow: "0 12px 30px rgba(124, 58, 237, 0.08)",
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: "rgba(124, 58, 237, 0.10)",
                    color: colors.purpleDeep,
                    fontSize: 11,
                    fontWeight: 950,
                    letterSpacing: 0.7,
                    marginBottom: 10,
                  }}
                >
                  COMING NEXT
                </div>

                <div style={{ display: "grid", gap: 9 }}>
                  {[
                    ["Day-before plan preview", "Know the big priorities before you enter the park."],
                    ["Morning priority plan", "Start strong without turning the day into a race."],
                    ["Resort-break timing", "Protect rest when the family starts fading."],
                    ["Must-do moments", "Keep the emotional wins from getting lost in the chaos."],
                  ].map(([title, text]) => (
                    <div
                      key={title}
                      style={{
                        padding: 12,
                        borderRadius: 18,
                        background: "rgba(255, 255, 255, 0.78)",
                        border: `1px solid ${colors.cardBorder}`,
                      }}
                    >
                      <strong style={{ color: colors.text }}>{title}</strong>
                      <p
                        style={{
                          margin: "5px 0 0",
                          color: colors.muted,
                          fontSize: 13,
                          lineHeight: 1.4,
                        }}
                      >
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            
    </>
  );
}

export default PlanTab;
