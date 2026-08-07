import {
  TOHI_DAY_SHELL,
  TOHI_DAY_THEME,
  TOHI_NIGHT_SHELL,
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

// 62A: the active app-shell token set follows the same forceMode contract as
// every other runtime lookup, so a caller that forces day can never receive
// night shell tokens.
export function getTohiShellTokens(input = {}) {
  return getTohiThemeMode(input) === TOHI_THEME_MODES.NIGHT
    ? TOHI_NIGHT_SHELL
    : TOHI_DAY_SHELL;
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
    activeShell: getTohiShellTokens(input),
  };
}

export function isTohiNightMode(input = {}) {
  return getTohiThemeMode(input) === TOHI_THEME_MODES.NIGHT;
}

export function isTohiDayMode(input = {}) {
  return getTohiThemeMode(input) === TOHI_THEME_MODES.DAY;
}
