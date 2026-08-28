import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import nextVitals from "eslint-config-next/core-web-vitals";

const scopeToWeb = (configs) =>
  configs.map((config) => ({ ...config, files: ["apps/web/**/*.{ts,tsx}"] }));

export default defineConfig([
  globalIgnores(["**/node_modules/**", "**/.next/**", "**/dist/**", "**/build/**", "**/next-env.d.ts"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
  },
  ...scopeToWeb(nextVitals),
  { settings: { next: { rootDir: "apps/web" } } },
  {
    // Ordered after eslint-config-next so these severities win.
    files: ["**/*.{ts,tsx}"],
    rules: {
      // TypeScript already checks this, and no-undef cannot see ambient types
      // like Next's generated LayoutProps/PageProps or platform globals.
      "no-undef": "off",
      "no-unused-expressions": "off",
      "no-lonely-if": "off",
      "no-loop-func": "off",
      strict: "off",
      "no-console": "warn",
      "guard-for-in": "warn",
      "object-shorthand": "warn",
      "new-cap": "warn",

      "@typescript-eslint/ban-ts-comment": ["error", { "ts-expect-error": false }],
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "@typescript-eslint/only-throw-error": "error",
      "@typescript-eslint/no-non-null-assertion": "error",

      "react/jsx-boolean-value": "warn",
      "react/jsx-key": "error",
      "react/jsx-no-undef": "error",
      // Off under the automatic JSX runtime (jsx: react-jsx); React is not imported.
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-vars": "warn",
      "react/no-did-mount-set-state": "warn",
      "react/no-did-update-set-state": "warn",
      "react/no-multi-comp": "off",
      "react/no-unknown-property": "error",
      "react/self-closing-comp": "warn",
      "react/jsx-curly-brace-presence": ["warn", { props: "never", children: "never" }],

      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/config": "error",
      "react-hooks/error-boundaries": "error",
      "react-hooks/gating": "error",
      "react-hooks/globals": "error",
      "react-hooks/hooks": "error",
      "react-hooks/immutability": "error",
      "react-hooks/memo-dependencies": "error",
      "react-hooks/no-deriving-state-in-effects": "error",
      "react-hooks/preserve-manual-memoization": "error",
      "react-hooks/purity": "error",
      "react-hooks/refs": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/set-state-in-render": "error",
      "react-hooks/static-components": "error",
      "react-hooks/syntax": "error",
      "react-hooks/unsupported-syntax": "error",
      "react-hooks/use-memo": "error",
      "react-hooks/void-use-memo": "error",
      "react-hooks/incompatible-library": "error",
    },
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
]);
