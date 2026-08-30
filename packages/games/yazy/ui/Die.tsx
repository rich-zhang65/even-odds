import type { PlayerId } from "@even-odds/game-sdk";
import { GameAsset, SEATS } from "@even-odds/game-sdk/ui";
import { cx } from "@even-odds/design-system/ui";
import { assets } from "../src/assets";

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const Pips = ({ value, dot }: { value: number; dot: string }) => (
  <span className="grid size-full grid-cols-3 grid-rows-3 place-items-center">
    {Array.from({ length: 9 }, (_, cell) => (
      <span
        key={cell}
        className={PIPS[value]?.includes(cell) === true ? cx("rounded-full bg-eo-strong", dot) : ""}
      />
    ))}
  </span>
);

export const Die = ({
  value,
  held,
  turn,
  dimmed,
  disabled,
  large,
  onToggle,
}: {
  value: number;
  held: boolean;
  turn: PlayerId;
  dimmed: boolean;
  disabled: boolean;
  large: boolean;
  onToggle: () => void;
}) => (
  <button
    className={cx(
      "grid shrink-0 place-items-center rounded-eo-md border-2 bg-eo-card transition-[transform,box-shadow,opacity] duration-(--eo-duration-fast) ease-eo-out enabled:cursor-pointer enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:cursor-not-allowed",
      large ? "size-16 p-2.5" : "size-14 p-[9px]",
      held ? cx(SEATS[turn].border, SEATS[turn].edge) : "border-eo-strong shadow-eo-edge-ink",
      dimmed && "opacity-45",
    )}
    type="button"
    disabled={disabled}
    onClick={onToggle}
    aria-label={`Die showing ${value}${held ? ", held" : ""}`}
    aria-pressed={held}
  >
    <GameAsset
      className="size-full"
      manifest={assets}
      slot={`die-${value}`}
      alt={`Die showing ${value}`}
      fallback={<Pips value={value} dot={large ? "size-2.5" : "size-2"} />}
    />
  </button>
);
