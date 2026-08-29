"use client";

import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, type LucideIcon } from "lucide-react";
import type { PlayerId, Snapshot } from "@even-odds/game-sdk";
import { GameAsset, SEATS, SEAT_ORDER, YouTag } from "@even-odds/game-sdk/ui";
import { Button, Card, Flex, Icon, cx } from "@even-odds/design-system/ui";
import type { Category, YahtzeeAction, YahtzeeState } from "../src/types";
import { assets } from "../src/assets";
import { legalScoringCategories, previewScore } from "../src/logic";
import { CATEGORY_INFO, LOWER_CATEGORIES, UPPER_CATEGORIES } from "../src/scoring";

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

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

const Die = ({
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

const DiceRow = ({
  state,
  turn,
  disabled,
  large,
  onAction,
}: {
  state: YahtzeeState;
  turn: PlayerId;
  disabled: boolean;
  large: boolean;
  onAction: (action: YahtzeeAction) => void;
}) => (
  <Flex wrap="wrap" justify="center" gap={large ? "12px" : "8px"}>
    {state.dice.map((value, index) => (
      <Die
        key={index}
        value={value}
        held={state.held[index] === true}
        turn={turn}
        dimmed={state.rollsLeft === 3}
        disabled={disabled || state.rollsLeft === 3}
        large={large}
        onToggle={() => onAction({ type: "TOGGLE_HOLD", index })}
      />
    ))}
  </Flex>
);

const RollPips = ({ used, spentText }: { used: number; spentText: string }) => (
  <Flex gap="6px" align="center">
    {[1, 2, 3].map((n) => (
      <Flex
        key={n}
        className={cx(
          "size-6 rounded-full border-2 border-eo-on-color font-eo-body text-[12px] font-extrabold tabular-nums leading-none",
          n <= used ? cx("bg-eo-on-color", spentText) : "text-eo-on-color",
        )}
        align="center"
        justify="center"
        shrink={0}
      >
        {n}
      </Flex>
    ))}
  </Flex>
);

const ScoreCell = ({
  player,
  category,
  state,
  open,
  onScore,
}: {
  player: PlayerId;
  category: Category;
  state: YahtzeeState;
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

const Scorecard = ({
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

export const YahtzeeBoard = ({
  snapshot,
  seat,
  onAction,
}: {
  snapshot: Snapshot<YahtzeeState>;
  seat: PlayerId | null;
  onAction: (action: YahtzeeAction) => void;
}) => {
  const state = snapshot.state;
  const result = snapshot.result;
  const live = snapshot.phase === "playing";
  const yourTurn = seat !== null && snapshot.currentPlayer === seat;
  const myTurn = live && yourTurn;
  const rollsUsed = 3 - state.rollsLeft;
  const selectable =
    myTurn && rollsUsed > 0 && seat !== null ? legalScoringCategories(state, seat) : [];

  const current = SEATS[snapshot.currentPlayer];

  const rollLabel = yourTurn && result === null ? "Roll" : null;

  const rollButton = (size: "md" | "lg") => (
    <Button
      fullWidth
      size={size}
      variant={current.button}
      disabled={!myTurn || state.rollsLeft === 0}
      onClick={() => onAction({ type: "ROLL" })}
      iconRight={
        <RollPips used={rollsUsed} spentText={current.accent} />
      }
    >
      {rollLabel}
    </Button>
  );

  return (
    <div>
      <Flex wrap="wrap" align="start" gap="24px">
        <div className="min-w-0 flex-[1_1_440px]">
          <Scorecard
            state={state}
            seat={seat}
            currentPlayer={snapshot.currentPlayer}
            live={live}
            selectable={selectable}
            onScore={(category) => onAction({ type: "SCORE", category })}
          />
        </div>

        {/* Above 800px the dice sit in a sticky rail; below it they move to the
            fixed tray below, so the scorecard keeps the full width. */}
        <div className="sticky top-6 flex-[0_0_288px] max-[800px]:hidden">
          <Card className="grid gap-5" tone="outlined">
            <DiceRow
              state={state}
              turn={snapshot.currentPlayer}
              disabled={!myTurn}
              large
              onAction={onAction}
            />
            {rollButton("lg")}
          </Card>
        </div>
      </Flex>

      <div className="h-39 min-[800px]:hidden" />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-eo-strong bg-eo-card px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] min-[800px]:hidden">
        <div className="mx-auto grid max-w-[312px] gap-3">
          <DiceRow
            state={state}
            turn={snapshot.currentPlayer}
            disabled={!myTurn}
            large={false}
            onAction={onAction}
          />
          {rollButton("md")}
        </div>
      </div>
    </div>
  );
};
