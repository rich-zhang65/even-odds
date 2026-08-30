import type { PlayerId } from "@even-odds/game-sdk";
import { SEATS } from "@even-odds/game-sdk/ui";
import { cx } from "@even-odds/design-system/ui";
import type { Category, YazyState } from "../src/types";
import { previewScore } from "../src/logic";
import { CATEGORY_INFO } from "../src/scoring";

export const ScoreCell = ({
  player,
  category,
  state,
  open,
  onScore,
}: {
  player: PlayerId;
  category: Category;
  state: YazyState;
  open: boolean;
  onScore: (category: Category) => void;
}) => {
  const seat = SEATS[player];
  const recorded = state.scores[player][category];

  // An untaken cell renders no text rather than a greyed zero, so a blank row
  // reads as "still open" instead of "scored nothing".
  return (
    <button
      className={cx(
        "min-h-14 border-l border-eo-hairline font-eo-body text-base font-extrabold tabular-nums transition-colors duration-(--eo-duration-fast) ease-eo-out",
        recorded !== undefined ? cx(seat.soft, seat.ink) : open ? cx("cursor-pointer", seat.pick, seat.ink) : seat.soft,
      )}
      type="button"
      disabled={!open}
      onClick={() => onScore(category)}
      aria-label={`${CATEGORY_INFO[category].label}, ${seat.name}`}
    >
      {recorded ?? (open ? previewScore(state, player, category) : null)}
    </button>
  );
};
