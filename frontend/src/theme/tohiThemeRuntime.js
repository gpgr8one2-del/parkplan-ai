import {
  TOHI_DAY_THEME,
  TOHI_NIGHT_THEME,
  TOHI_PREMIUM_THEME,
} from "./tohiTheme.js";

export const TOHI_THEME_MODES = {
  DAY: "day",
  NIGHT: "night",
};

export function getLocalHour(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return new Date().getHours();
  }

  return date.getHours();
}

export function getTohiThemeMode({
  date = new Date(),
  hour,
  forceMode,
} = {}) {
  if (forceMode === TOHI_THEME_MODES.DAY || forceMode === TOHI_THEME_MODES.NIGHT) {
    return forceMode;
  }

  const localHour = Number.isFinite(Number(hour)) ? Number(hour) : getLocalHour(date);

  if (localHour >= 18 || localHour < 6) {
    return TOHI_THEME_MODES.NIGHT;
  }

  return TOHI_THEME_MODES.DAY;
}

export function getTohiTheme(input = {}) {
  const mode = getTohiThemeMode(input);

  return mode === TOHI_THEME_MODES.NIGHT ? TOHI_NIGHT_THEME : TOHI_DAY_THEME;
}

export function getTohiThemeTokens(input = {}) {
  const theme = getTohiTheme(input);

  return {
    ...TOHI_PREMIUM_THEME,
    activeMode: theme.mode,
    activeTheme: theme,
    activeColors: theme.colors,
    activeBackground: theme.background,
    activeSurface: theme.surface,
    activeHeroGradient: theme.heroGradient,
    activeBottomNavBackground: theme.bottomNavBackground,
  };
}

export function isTohiNightMode(input = {}) {
  return getTohiThemeMode(input) === TOHI_THEME_MODES.NIGHT;
}

export function isTohiDayMode(input = {}) {
  return getTohiThemeMode(input) === TOHI_THEME_MODES.DAY;
}
