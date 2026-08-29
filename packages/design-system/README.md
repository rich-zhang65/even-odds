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

## Dark mode

Set `data-theme="dark"` on `<html>`. Only the semantic aliases repoint; the raw ramps
are identical in both themes, so **a component that reaches past a semantic token into
a ramp step will not flip**. Reach for the semantic every time:

| Instead of              | Use                    |
| ----------------------- | ---------------------- |
| `bg-eo-paper`           | `bg-eo-card`           |
| `bg-eo-ink-100`         | `bg-eo-sunken`         |
| `border-eo-ink-900`     | `border-eo-strong`     |
| `border-eo-ink-300`     | `border-eo-control-line` |
| `bg-eo-red-50`          | `bg-eo-red-soft`       |
| `bg-eo-red-400`         | `bg-eo-red-solid`      |
| `text-eo-red-600`       | `text-eo-red-ink`      |
| `border-eo-red-500`     | `border-eo-red-line`   |
| `border-eo-red-200`     | `border-eo-red-hairline` |

Each player colour carries the same five slots: `solid` and `soft` for fills, `ink` for
text, `line` and `hairline` for the strong and soft edge. A filled surface keeps
`text-eo-on-color` (it is white in both themes); an inverted surface pairs
`bg-eo-inverse` with `text-eo-on-inverse`, since both ends swap.

Tailwind inlines a `--shadow-*` value into the utility, so those tokens cannot be
repointed by theme. Every colour inside one is a var (`--eo-shadow-md`,
`--eo-edge-inverse`, `--eo-focus-ring`) and the theme repoints those instead.

`dark:` is rebound to the attribute, so `dark:` utilities follow the switcher rather
than the OS. After the sweep above almost nothing needs it.

Setting the attribute is the app's job, since it owns storage and the pre-paint boot
script: see `apps/web/src/lib/theme.ts` and the `ThemeToggle` beside it. The toggle
holds no state — it reads and flips the attribute, and swaps its own glyph with
`dark:`, so nothing has to be hydrated.

## Components

```ts
import { Button, GameCard, ScoreBoard } from "@even-odds/design-system/ui";
```

| Group      | Components                                          |
| ---------- | --------------------------------------------------- |
| Core       | `Button` `Card` `Badge` `Tag` `Icon` `IconButton`     |
| Forms      | `Input` `Checkbox` `Radio` `Select` `Switch`          |
| Feedback   | `Dialog` `Toast` `Tooltip`                            |
| Game       | `GameCard` `PlayerChip` `ScoreBoard` `VersusBanner`   |
| Navigation | `Tabs`                                                |
| Layout     | `Flex`                                                |

`Flex` is the layout primitive: it maps its props to Tailwind utilities and
appends `className` last, so callers keep responsive overrides.

```tsx
<Flex align="center" justify="space-between" gap="16px" className="max-md:flex-col">
```

`gap` and `basis` take any CSS length. They render as inline styles rather than
utilities, since Tailwind only generates classes it can find in the source, so a
`gap-*` or `basis-*` utility in `className` will not override them.

None of them hold state: hover, press and focus are CSS variants, so every
component is driven entirely by its props. Only the ones taking event handlers
carry `"use client"`; the rest render as server components.

Components that show a glyph take it as a rendered node, not a component type
(`icon={<Icon icon={Swords} />}`), because a component cannot be passed across a
server/client boundary.

The app must register this directory with Tailwind, alongside the game UI it
already scans:

```css
@source "../../../../packages/design-system/ui";
```

## Fonts

The theme names **Fredoka** for display and **Nunito** for body. Loading them is the
app's job, following the pattern already in `apps/web/src/app/layout.tsx`: declare them
with `next/font/google` and bind each to the matching variable.

## Assets

No logo file exists. Wherever a mark belongs, render the wordmark as type: `even.odds`,
lowercase Fredoka 700, with the dot in `--color-eo-red-400` or `--color-eo-blue-500` —
never both.
