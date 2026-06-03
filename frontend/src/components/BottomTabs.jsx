import React from "react";
import { createPortal } from "react-dom";
import {
  Home,
  Clock,
  CalendarDays,
  Sparkles,
  UserCircle,
} from "lucide-react";

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

const NAV_HEIGHT_PX = 78;

function BottomTabsContent({ activeTab = "home", onTabChange }) {
  return (
    <nav
      aria-label="Primary app navigation"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        top: "auto",
        width: "100vw",
        zIndex: 2147483647,
        padding: "8px 10px calc(8px + env(safe-area-inset-bottom, 0px))",
        background: "rgba(255, 252, 247, 0.98)",
        borderTop: "1px solid #EFE7DA",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: "0 -10px 30px rgba(28, 25, 23, 0.10)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 4,
          maxWidth: 720,
          margin: "0 auto",
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
                border: "none",
                background: isActive
                  ? "rgba(124, 58, 237, 0.10)"
                  : "transparent",
                color: isActive ? "#7C3AED" : "#78716C",
                borderRadius: 16,
                padding: "8px 4px 7px",
                minHeight: 54,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                fontSize: 11,
                fontWeight: isActive ? 800 : 700,
                letterSpacing: 0.1,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.7 : 2.3}
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

export function BottomTabs({ activeTab = "home", onTabChange }) {
  const content = (
    <>
      <div
        aria-hidden="true"
        style={{
          height: `calc(${NAV_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))`,
          flex: "0 0 auto",
        }}
      />

      <BottomTabsContent activeTab={activeTab} onTabChange={onTabChange} />
    </>
  );

  if (typeof document === "undefined" || !document.body) {
    return content;
  }

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          height: `calc(${NAV_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px))`,
          flex: "0 0 auto",
        }}
      />
      {createPortal(
        <BottomTabsContent activeTab={activeTab} onTabChange={onTabChange} />,
        document.body
      )}
    </>
  );
}

export default BottomTabs;
