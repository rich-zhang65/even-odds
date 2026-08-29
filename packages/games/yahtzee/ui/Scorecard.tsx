import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, type LucideIcon } from "lucide-react";
import type { PlayerId } from "@even-odds/game-sdk";
import { SEATS, SEAT_ORDER, YouTag } from "@even-odds/game-sdk/ui";
import { Flex, Icon, cx } from "@even-odds/design-system/ui";
import type { Category, YahtzeeState } from "../src/types";
import { LOWER_CATEGORIES, UPPER_CATEGORIES } from "../src/scoring";
import { ScoreCell } from "./ScoreCell";

const CATEGORY_ICONS: Record<Category, LucideIcon[]> = {
  ones: [Dice1],
  twos: [Dice2],
  threes: [Dice3],
  fours: [Dice4],
  fives: [Dice5],
  sixes: [Dice6],
  threeOfAKind: [Dice4, Dice4, Dice4],
  fourOfAKind: [Dice4, Dice4, Dice4, Dice4],
  fullHouse: [Dice6, Dice6, Dice6, Dice2, Dice2],
  straight: [Dice1, Dice2, Dice3, Dice4, Dice5],
  yahtzee: [Dice5, Dice5, Dice5, Dice5, Dice5],
};

const ROW_GRID = "grid grid-cols-[minmax(0,1fr)_clamp(76px,18vw,110px)_clamp(76px,18vw,110px)]";

export const Scorecard = ({
  state,
  seat,
  currentPlayer,
  live,
  selectable,
  onScore,
}: {
  state: YahtzeeState;
  seat: PlayerId | null;
  currentPlayer: PlayerId;
  live: boolean;
  selectable: Category[];
  onScore: (category: Category) => void;
}) => {
  const row = (category: Category, divider = false) => (
    <div
      key={category}
      className={cx(ROW_GRID, divider ? "border-t-2 border-eo-strong" : "border-t border-eo-hairline")}
    >
      <Flex className="min-w-0 px-4 py-2 text-eo-body" align="center" gap="4px">
        {CATEGORY_ICONS[category].map((glyph, index) => (
          <Icon key={index} icon={glyph} size={CATEGORY_ICONS[category].length === 1 ? 28 : 22} />
        ))}
      </Flex>
      {SEAT_ORDER.map((player) => (
        <ScoreCell
          key={player}
          player={player}
          category={category}
          state={state}
          open={player === seat && selectable.includes(category)}
          onScore={onScore}
        />
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden rounded-eo-lg border border-eo-hairline bg-eo-card shadow-eo-sm">
      <div className={ROW_GRID}>
        <div className="min-h-13" />
        {SEAT_ORDER.map((player) => (
          <div
            key={player}
            className={cx(
              "grid min-h-13 place-items-center border-l border-b-[3px] border-eo-hairline",
              SEATS[player].soft,
              live && player === currentPlayer ? SEATS[player].underline : "border-b-transparent",
            )}
          >
            {player === seat && (
              <YouTag className={cx(SEATS[player].solid, "text-eo-on-color")} />
            )}
          </div>
        ))}
      </div>

      {UPPER_CATEGORIES.map((category) => row(category))}
      {LOWER_CATEGORIES.map((category, index) => row(category, index === 0))}
    </div>
  );
};
