# @even-odds/design-system

Even Odds brand tokens and UI components.

## Tokens

`styles/theme.css` is a Tailwind `@theme` block, so every token is both a CSS custom
property and a utility class:

```css
@import "tailwindcss";
@import "@even-odds/design-system/styles.css";
```

| Group     | Example token             | Utility                  |
| --------- | ------------------------- | ------------------------ |
| Colour    | `--color-eo-red-400`      | `bg-eo-red-400`          |
| Semantic  | `--color-eo-muted`        | `text-eo-muted`          |
| Type      | `--text-eo-display-l`     | `text-eo-display-l`      |
| Family    | `--font-eo-display`       | `font-eo-display`        |
| Radius    | `--radius-eo-md`          | `rounded-eo-md`          |
| Elevation | `--shadow-eo-edge-blue`   | `shadow-eo-edge-blue`    |
| Motion    | `--animate-eo-pop`        | `animate-eo-pop`         |

Type tokens carry their line height and weight, so `text-eo-display-l` sets all three.

Spacing is deliberately absent: the brand's 4px scale already matches Tailwind's
default, so `p-4` is the 16px step.

Tokens with no Tailwind namespace (durations, control heights, gradients) stay raw and
are used as arbitrary values, e.g. `h-(--eo-control-md)` or `bg-(image:--eo-versus)`.

## Fonts

The theme names **Fredoka** for display and **Nunito** for body. Loading them is the
app's job, following the pattern already in `apps/web/src/app/layout.tsx`: declare them
with `next/font/google` and bind each to the matching variable.

## Assets

No logo file exists. Wherever a mark belongs, render the wordmark as type: `even.odds`,
lowercase Fredoka 700, with the dot in `--color-eo-red-400` or `--color-eo-blue-500` —
never both.
