export type Theme = "light" | "dark";

const STORAGE_KEY = "eo-theme";

// Inlined into the document head and run before first paint, so the page never
// flashes light before the stored choice lands. It has to be a string: nothing
// bundled would run early enough, and a stored theme has to beat the OS default.
// The storage read carries its own try: blocked storage throws rather than
// returning null, and one catch around the whole body would swallow the OS
// fallback with it, leaving the page light on a dark-preferring machine.
export const THEME_BOOT_SCRIPT = `try{var t;try{t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)})}catch(e){}if(t!=="dark"&&t!=="light")t=matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

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
