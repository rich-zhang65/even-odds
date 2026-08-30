"use client";

import { useLayoutEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "@even-odds/design-system/ui";
import { applyTheme, resolveTheme, toggleTheme } from "@/lib/theme";

// Stateless on purpose: the glyphs key off the same data-theme attribute the CSS
// does, so the button never has to agree with the server about which theme
// rendered. The effect only repairs dev — Strict Mode's remount resets <html> to
// the attributes React manages from JSX, dropping the one the boot script set.
// It is a no-op in production, and useLayoutEffect runs before paint.
export const ThemeToggle = () => {
  useLayoutEffect(() => {
    applyTheme(resolveTheme());
  }, []);

  return (
    <IconButton
      label="Toggle dark mode"
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      icon={
        <>
          <Sun className="hidden dark:block" aria-hidden="true" />
          <Moon className="dark:hidden" aria-hidden="true" />
        </>
      }
    />
  );
};
