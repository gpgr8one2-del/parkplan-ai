import React from "react";

/**
 * The last thing standing between a rendering crash and the family.
 *
 * It used to render error.message straight onto the screen under the heading
 * "Something broke." — so a guest in a park could be shown
 * "Cannot read properties of undefined (reading 'landKey')". That is a stack
 * trace wearing a sentence, and it tells them nothing they can act on.
 *
 * The fallback now says what happened in plain words and offers the one control
 * that actually helps. It deliberately does NOT guess at a cause: a render
 * crash is not evidence of a network problem, and blaming the family's signal
 * would be a guess dressed as an explanation.
 *
 * The message is kept for diagnostics — componentDidCatch still logs the error
 * and its component stack to the console exactly as before. Nothing new is
 * logged, and nothing is sent anywhere.
 */
const RECOVERY_COPY = {
  TITLE: "Something stopped working.",
  BODY: "This screen ran into a problem. Reloading usually clears it, and your trip details are saved.",
  ACTION: "Reload app",
};

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    // Still captured, still available to componentDidCatch and to anything
    // inspecting state. It is simply no longer rendered.
    return { hasError: true, errorMessage: error?.message || "Something went wrong." };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
          <h2>{RECOVERY_COPY.TITLE}</h2>
          <p>{RECOVERY_COPY.BODY}</p>
          <button onClick={() => window.location.reload()}>{RECOVERY_COPY.ACTION}</button>
        </div>
      );
    }
    return this.props.children;
  }
}
