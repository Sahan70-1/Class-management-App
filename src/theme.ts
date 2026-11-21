export type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "classroom-theme";

export function readTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    // Storage may be unavailable. Keep an in-session selection on the document.
    return typeof document !== "undefined" && document.documentElement.dataset.theme === "dark"
      ? "dark"
      : "light";
  }
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  const bar = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const color = bar?.dataset[theme];
  if (bar && color) bar.content = color;
}

export function saveTheme(theme: Theme) {
  applyTheme(theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Applying the choice in this session does not require persistent storage.
  }
}
