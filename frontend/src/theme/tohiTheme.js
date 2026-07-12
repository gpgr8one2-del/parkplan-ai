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

export const TOHI_PREMIUM_THEME = {
  colors: TOHI_THEME_COLORS,
  radii: TOHI_THEME_RADII,
  shadows: TOHI_THEME_SHADOWS,
  gradients: TOHI_THEME_GRADIENTS,
  spacing: TOHI_THEME_SPACING,
  typography: TOHI_THEME_TYPOGRAPHY,
  day: TOHI_DAY_THEME,
  night: TOHI_NIGHT_THEME,
};

export default TOHI_PREMIUM_THEME;
