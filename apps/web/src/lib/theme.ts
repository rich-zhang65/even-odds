export type Theme = "light" | "dark";

const STORAGE_KEY = "eo-theme";

// Inlined into the document head and run before first paint, so the page never
// flashes light before the stored choice lands. It has to be a string: nothing
// bundled would run early enough, and a stored theme has to beat the OS default.
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(t!=="dark"&&t!=="light")t=matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

// Must stay in step with THEME_BOOT_SCRIPT above: stored choice first, OS second.
// theme.test.ts asserts the two agree.
export const resolveTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // fall through to the OS preference
  }
  return matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light";
};

export const applyTheme = (theme: Theme) => {
  document.documentElement.dataset.theme = theme;
};

export const toggleTheme = () => {
  const next: Theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private-mode storage denial should still leave the theme switched.
  }
};
