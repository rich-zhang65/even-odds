import { beforeEach, describe, expect, it } from "vitest";
import { THEME_BOOT_SCRIPT, resolveTheme, toggleTheme } from "../theme";

const stored: Record<string, string> = {};

// The boot script ships as a string, so nothing typechecks it. Running the real
// string is the only way to catch it drifting from the key toggleTheme writes.
const boot = (prefersDark: boolean) => {
  (globalThis as any).matchMedia = () => ({ matches: prefersDark });
  new Function(THEME_BOOT_SCRIPT)();
};

const freshDocument = () => {
  (globalThis as any).document = { documentElement: { dataset: {} } };
};

const theme = () => (globalThis as any).document.documentElement.dataset.theme;

// Blocked third-party storage and some privacy modes throw on access rather than
// returning null, which must not cost us the OS preference.
const denyStorage = () => {
  (globalThis as any).localStorage = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("denied");
    },
  };
};

beforeEach(() => {
  for (const key of Object.keys(stored)) delete stored[key];
  freshDocument();
  (globalThis as any).localStorage = {
    getItem: (key: string) => stored[key] ?? null,
    setItem: (key: string, value: string) => {
      stored[key] = value;
    },
  };
});

describe("theme", () => {
  it("follows the OS on a first visit", () => {
    boot(true);
    expect(theme()).toBe("dark");
  });

  it("lands on light when the OS does not ask for dark", () => {
    boot(false);
    expect(theme()).toBe("light");
  });

  it("lets a stored choice beat the OS", () => {
    stored["eo-theme"] = "light";
    boot(true);
    expect(theme()).toBe("light");
  });

  it("flips the attribute and survives the next boot", () => {
    boot(false);
    toggleTheme();
    expect(theme()).toBe("dark");

    freshDocument();
    boot(false);
    expect(theme()).toBe("dark");
  });

  it("still switches when storage throws", () => {
    boot(false);
    (globalThis as any).localStorage.setItem = () => {
      throw new Error("denied");
    };
    toggleTheme();
    expect(theme()).toBe("dark");
  });

  it("keeps the OS preference when storage access throws", () => {
    denyStorage();
    boot(true);
    expect(theme()).toBe("dark");
  });

  // The dev-remount repair in ThemeToggle re-derives the theme in TS rather than
  // by running the script, so the two have to reach the same answer every time.
  it.each([
    { stored: null, prefersDark: false },
    { stored: null, prefersDark: true },
    { stored: "light", prefersDark: true },
    { stored: "dark", prefersDark: false },
    { stored: "chartreuse", prefersDark: true },
    { stored: "chartreuse", prefersDark: false },
    { stored: null, prefersDark: true, denied: true },
    { stored: null, prefersDark: false, denied: true },
  ])(
    "resolveTheme agrees with the boot script (%j)",
    ({ stored: value, prefersDark, denied }) => {
      if (value !== null) stored["eo-theme"] = value;
      if (denied === true) denyStorage();
      boot(prefersDark);
      expect(theme()).toMatch(/^(light|dark)$/);
      expect(resolveTheme()).toBe(theme());
    },
  );
});
