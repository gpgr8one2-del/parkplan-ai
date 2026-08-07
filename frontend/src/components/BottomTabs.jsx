import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Home,
  Clock,
  CalendarDays,
  Sparkles,
  UserCircle,
} from "lucide-react";

import { getTohiAppShellTheme, TOHI_THEME_MODES } from "../theme";

const TABS = [
  {
    key: "home",
    label: "Home",
    icon: Home,
  },
  {
    key: "waits",
    label: "Waits",
    icon: Clock,
  },
  {
    key: "plan",
    label: "Plan",
    icon: CalendarDays,
  },
  {
    key: "tohi",
    label: "TOHI",
    icon: Sparkles,
  },
  {
    key: "profile",
    label: "Profile",
    icon: UserCircle,
  },
];

const NAV_BASE_HEIGHT_PX = 82;

function getVisualViewportStyle() {
  if (typeof window === "undefined" || !window.visualViewport) {
    return {
      top: `calc(100dvh - ${NAV_BASE_HEIGHT_PX}px - env(safe-area-inset-bottom, 0px))`,
    };
  }

  const viewport = window.visualViewport;
  const viewportTop = viewport.offsetTop || 0;
  const viewportHeight = viewport.height || window.innerHeight || 0;

  return {
    top: `calc(${Math.max(
      0,
      viewportTop + viewportHeight - NAV_BASE_HEIGHT_PX
    )}px - env(safe-area-inset-bottom, 0px))`,
  };
}

function useVisualViewportStyle() {
  const [viewportStyle, setViewportStyle] = useState(() => getVisualViewportStyle());

  useEffect(() => {
    let frameId = null;

    const update = () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }

      frameId = requestAnimationFrame(() => {
        setViewportStyle(getVisualViewportStyle());
      });
    };

    update();

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }

      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  return viewportStyle;
}

function BottomTabsContent({ activeTab = "home", onTabChange, night = false }) {
  const viewportStyle = useVisualViewportStyle();
  // 62A: BottomTabs never decides for itself whether it is night. It forces the
  // mode App supplies, so an unconverted tab always resolves to day tokens.
  const shellTheme = getTohiAppShellTheme({
    forceMode: night ? TOHI_THEME_MODES.NIGHT : TOHI_THEME_MODES.DAY,
  });
  const shell = shellTheme.shellTokens;
  const navBackground = shell.navBackground;

  return (
    <nav
      aria-label="Primary"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: viewportStyle.top,
        bottom: "auto",
        width: "100vw",
        zIndex: 2147483647,
        padding: "8px 10px calc(8px + env(safe-area-inset-bottom, 0px))",
        background: navBackground,
        borderTop: `1px solid ${shell.navBorder}`,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: shell.navShadow,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 5,
          maxWidth: 720,
          margin: "0 auto",
          padding: 4,
          borderRadius: 24,
          background: shell.navTrayBackground,
          border: shell.navTrayBorder,
          boxShadow: shell.navTrayInset,
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange?.(tab.key)}
              aria-current={isActive ? "page" : undefined}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                border: isActive ? shell.navActiveBorder : shell.navInactiveBorder,
                background: isActive
                  ? shell.navActiveBackground
                  : shell.navInactiveBackground,
                color: isActive ? shell.navActiveColor : shell.navInactiveColor,
                borderRadius: 18,
                padding: "7px 4px 8px",
                minHeight: 56,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: isActive ? 900 : 800,
                letterSpacing: 0.1,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                boxShadow: isActive ? shell.navActiveShadow : shell.navInactiveShadow,
                transform: isActive ? "translateY(-1px)" : "none",
                transition:
                  "background 160ms ease, color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
              }}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.8 : 2.3}
                aria-hidden="true"
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function BottomTabs({ activeTab = "home", onTabChange, night = false }) {
  const spacer = (
    <div
      aria-hidden="true"
      style={{
        height: `calc(${NAV_BASE_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))`,
        flex: "0 0 auto",
      }}
    />
  );

  // 62A: night is forwarded through both the server/non-portal fallback and the
  // portal render, so the two paths can never disagree about the mode.
  if (typeof document === "undefined" || !document.body) {
    return (
      <>
        {spacer}
        <BottomTabsContent
          activeTab={activeTab}
          onTabChange={onTabChange}
          night={night}
        />
      </>
    );
  }

  return (
    <>
      {spacer}
      {createPortal(
        <BottomTabsContent
          activeTab={activeTab}
          onTabChange={onTabChange}
          night={night}
        />,
        document.body
      )}
    </>
  );
}

export default BottomTabs;
