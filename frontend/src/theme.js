import {
  TOHI_PREMIUM_THEME,
  TOHI_THEME_COLORS,
  TOHI_THEME_GRADIENTS,
  TOHI_THEME_RADII,
  TOHI_THEME_SHADOWS,
  TOHI_THEME_SPACING,
  TOHI_THEME_TYPOGRAPHY,
} from "./theme/tohiTheme.js";
import {
  TOHI_THEME_MODES,
  getTohiThemeMode,
  getTohiThemeTokens,
  isTohiDayMode,
  isTohiNightMode,
} from "./theme/tohiThemeRuntime.js";

export const colors = {
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

export const legacyTheme = {
  colors,
};

export const premiumTheme = TOHI_PREMIUM_THEME;

export const tohiThemeBridge = {
  legacy: legacyTheme,
  premium: premiumTheme,
  colors: {
    legacy: colors,
    premium: TOHI_THEME_COLORS,
  },
  tokens: {
    radii: TOHI_THEME_RADII,
    shadows: TOHI_THEME_SHADOWS,
    gradients: TOHI_THEME_GRADIENTS,
    spacing: TOHI_THEME_SPACING,
    typography: TOHI_THEME_TYPOGRAPHY,
  },
};

export function getTohiAppShellTheme(input = {}) {
  const premiumTokens = getTohiThemeTokens(input);
  const activeMode = getTohiThemeMode(input);

  return {
    legacy: legacyTheme,
    premium: premiumTokens,
    mode: activeMode,
    isDay: isTohiDayMode(input),
    isNight: isTohiNightMode(input),

    colors,
    premiumColors: premiumTokens.activeColors,

    appBackground: premiumTokens.activeBackground || colors.background,
    appBackgroundSoft: TOHI_THEME_COLORS.backgroundSoft,
    appBackgroundGradient: TOHI_THEME_GRADIENTS.appBackground,

    surface: premiumTokens.activeSurface || colors.card,
    card: colors.card,
    cardWarm: colors.cardWarm,
    border: colors.cardBorder,

    text: colors.text,
    muted: colors.muted,

    heroGradient: premiumTokens.activeHeroGradient,
    bottomNavBackground: premiumTokens.activeBottomNavBackground,

    radii: TOHI_THEME_RADII,
    shadows: TOHI_THEME_SHADOWS,
    spacing: TOHI_THEME_SPACING,
    typography: TOHI_THEME_TYPOGRAPHY,
  };
}

export {
  TOHI_PREMIUM_THEME,
  TOHI_THEME_COLORS,
  TOHI_THEME_GRADIENTS,
  TOHI_THEME_MODES,
  TOHI_THEME_RADII,
  TOHI_THEME_SHADOWS,
  TOHI_THEME_SPACING,
  TOHI_THEME_TYPOGRAPHY,
  getTohiThemeMode,
  getTohiThemeTokens,
  isTohiDayMode,
  isTohiNightMode,
};
