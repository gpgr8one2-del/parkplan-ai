export const TOHI_THEME_COLORS = {
  background: "#FFF4E6",
  backgroundSoft: "#FFF9F1",

  card: "#FFFFFF",
  cardWarm: "#FFF7ED",
  cardPurple: "#F3E8FF",
  cardBorder: "#EADCC8",

  text: "#241C15",
  muted: "#7A6F63",

  purple: "#7C3AED",
  purpleDeep: "#5B21B6",
  purpleSoft: "#F3E8FF",

  amber: "#F59E0B",
  amberSoft: "#FEF3C7",

  coral: "#FB7185",
  coralSoft: "#FFE4E6",

  sky: "#38BDF8",
  skySoft: "#E0F2FE",

  success: "#059669",
  successSoft: "#D1FAE5",

  error: "#DC2626",
  errorSoft: "#FEE2E2",
};

export const TOHI_THEME_RADII = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const TOHI_THEME_SHADOWS = {
  soft: "0 8px 20px rgba(36, 28, 21, 0.06)",
  card: "0 14px 34px rgba(36, 28, 21, 0.08)",
  premium: "0 18px 42px rgba(91, 33, 182, 0.24)",
};

export const TOHI_THEME_GRADIENTS = {
  appBackground: "linear-gradient(180deg, #FFF4E6 0%, #FFF9F1 100%)",
  heroDay: "linear-gradient(145deg, #7C3AED 0%, #FB7185 52%, #F59E0B 100%)",
  heroNight: "linear-gradient(145deg, #241C15 0%, #5B21B6 58%, #7C3AED 100%)",
  cardWarm: "linear-gradient(145deg, #FFFFFF 0%, #FFF7ED 100%)",
  cardSky: "linear-gradient(145deg, #FFFFFF 0%, #E0F2FE 100%)",
  cardPurple: "linear-gradient(145deg, #FFFFFF 0%, #F3E8FF 100%)",
  ctaPurple: "linear-gradient(145deg, #7C3AED 0%, #5B21B6 100%)",
};

export const TOHI_THEME_SPACING = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const TOHI_THEME_TYPOGRAPHY = {
  eyebrow: {
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 1.12,
    fontWeight: 950,
    letterSpacing: -0.3,
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 1.04,
    fontWeight: 950,
    letterSpacing: -0.6,
  },
  body: {
    fontSize: 14,
    lineHeight: 1.45,
    fontWeight: 650,
  },
  caption: {
    fontSize: 12,
    lineHeight: 1.35,
    fontWeight: 750,
  },
};

export const TOHI_DAY_THEME = {
  mode: "day",
  colors: TOHI_THEME_COLORS,
  background: TOHI_THEME_COLORS.background,
  surface: TOHI_THEME_COLORS.card,
  heroGradient: TOHI_THEME_GRADIENTS.heroDay,
  bottomNavBackground: "rgba(255, 249, 241, 0.98)",
};

export const TOHI_NIGHT_THEME = {
  mode: "night",
  colors: {
    ...TOHI_THEME_COLORS,
    background: "#241C15",
    backgroundSoft: "#2F2540",
    card: "#FFFFFF",
    text: "#FFF9F1",
    muted: "#EADCC8",
  },
  background: "#241C15",
  surface: "#FFFFFF",
  heroGradient: TOHI_THEME_GRADIENTS.heroNight,
  bottomNavBackground: "rgba(36, 28, 21, 0.96)",
};

// 62A app-shell tokens. These describe the shared page chrome and the bottom
// navigation only — they are deliberately separate from the Plan card tokens so
// converting a tab cannot disturb card styling.
//
// TOHI_DAY_SHELL reproduces the values the shell and BottomTabs already use
// today, verbatim, so day mode resolves to exactly what it renders now.
export const TOHI_DAY_SHELL = {
  mode: "day",
  pageBackground: TOHI_THEME_GRADIENTS.appBackground,
  pageBackgroundColor: TOHI_THEME_COLORS.background,
  text: TOHI_THEME_COLORS.text,
  muted: TOHI_THEME_COLORS.muted,
  surface: TOHI_THEME_COLORS.card,
  border: TOHI_THEME_COLORS.cardBorder,
  shadow: TOHI_THEME_SHADOWS.card,

  navBackground: "rgba(255, 249, 241, 0.98)",
  navBorder: TOHI_THEME_COLORS.cardBorder,
  navShadow: TOHI_THEME_SHADOWS.premium,
  navTrayBackground: "rgba(255, 255, 255, 0.52)",
  navTrayBorder: "1px solid rgba(234, 220, 200, 0.55)",
  navTrayInset: "inset 0 1px 0 rgba(255, 255, 255, 0.76)",
  navActiveBackground:
    "linear-gradient(145deg, rgba(255,255,255,0.96), rgba(243,232,255,0.94))",
  navActiveBorder: "1px solid rgba(124, 58, 237, 0.24)",
  navActiveColor: TOHI_THEME_COLORS.purpleDeep,
  navActiveShadow: "0 10px 22px rgba(124, 58, 237, 0.16)",
  navInactiveBackground: "transparent",
  navInactiveBorder: "1px solid transparent",
  navInactiveColor: TOHI_THEME_COLORS.muted,
  navInactiveShadow: "none",
};

// Night uses the Plan navy/purple language already established by planTokens
// and PLAN_TAB_NIGHT_PALETTE: navy backgrounds, muted purple borders, light
// lavender active accents, readable blue-gray inactive text. No pure black and
// no pale card surfaces inside the navigation.
export const TOHI_NIGHT_SHELL = {
  mode: "night",
  pageBackground: "linear-gradient(180deg, #0F172A 0%, #111A33 55%, #131C36 100%)",
  pageBackgroundColor: "#0F172A",
  text: "#F5F3FF",
  muted: "#B6C2E2",
  surface: "#131C36",
  border: "rgba(139, 92, 246, 0.30)",
  shadow: "0 14px 34px rgba(2, 6, 23, 0.45)",

  navBackground: "rgba(15, 23, 42, 0.96)",
  navBorder: "rgba(139, 92, 246, 0.30)",
  navShadow: "0 -12px 32px rgba(2, 6, 23, 0.55)",
  navTrayBackground: "rgba(19, 28, 54, 0.72)",
  navTrayBorder: "1px solid rgba(99, 102, 241, 0.26)",
  navTrayInset: "inset 0 1px 0 rgba(139, 92, 246, 0.18)",
  navActiveBackground:
    "linear-gradient(145deg, rgba(76, 29, 149, 0.55), rgba(30, 27, 75, 0.85))",
  navActiveBorder: "1px solid rgba(139, 92, 246, 0.45)",
  navActiveColor: "#C4B5FD",
  navActiveShadow: "0 10px 22px rgba(2, 6, 23, 0.45)",
  navInactiveBackground: "transparent",
  navInactiveBorder: "1px solid transparent",
  navInactiveColor: "#B6C2E2",
  navInactiveShadow: "none",
};

export const TOHI_PREMIUM_THEME = {
  colors: TOHI_THEME_COLORS,
  radii: TOHI_THEME_RADII,
  shadows: TOHI_THEME_SHADOWS,
  gradients: TOHI_THEME_GRADIENTS,
  spacing: TOHI_THEME_SPACING,
  typography: TOHI_THEME_TYPOGRAPHY,
  day: TOHI_DAY_THEME,
  night: TOHI_NIGHT_THEME,
  dayShell: TOHI_DAY_SHELL,
  nightShell: TOHI_NIGHT_SHELL,
};

export default TOHI_PREMIUM_THEME;
