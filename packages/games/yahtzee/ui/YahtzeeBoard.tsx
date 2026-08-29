"use client";

import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, LogOut, type LucideIcon } from "lucide-react";
import type { PlayerId, Snapshot } from "@even-odds/game-sdk";
import { GameAsset } from "@even-odds/game-sdk/ui";
import { Button, Card, Flex, Icon, cx } from "@even-odds/design-system/ui";
import type { ControlVariant } from "@even-odds/design-system/ui";
import type { Category, YahtzeeAction, YahtzeeState } from "../src/types";
import { assets } from "../src/assets";
import { legalScoringCategories, previewScore } from "../src/logic";
import { CATEGORY_INFO, LOWER_CATEGORIES, UPPER_CATEGORIES, totalScore } from "../src/scoring";

type SeatTheme = {
  name: string;
  column: string;
  activeEdge: string;
  youPill: string;
  scored: string;
  open: string;
  nameText: string;
  totalText: string;
  dieBorder: string;
  dieEdge: string;
  rollVariant: ControlVariant;
  banner: string;
};

const PLAYERS: PlayerId[] = ["p0", "p1"];

/* Every colour here is a semantic token, never a raw ramp step: the ramps do not
   repoint in dark mode, so a bg-eo-red-50 column would stay pale on an ink page. */
const SEATS: Record<PlayerId, SeatTheme> = {
  p0: {
    name: "Red",
    column: "bg-eo-red-soft",
    activeEdge: "border-b-eo-red-solid",
    youPill: "bg-eo-red-solid",
    scored: "bg-eo-red-soft text-eo-red-ink",
    open: "cursor-pointer bg-eo-red-solid/20 text-eo-red-ink hover:bg-eo-red-solid/35",
    nameText: "text-eo-red-ink",
    totalText: "text-eo-red-solid",
    dieBorder: "border-eo-red-solid",
    dieEdge: "shadow-eo-edge-red",
    rollVariant: "red",
    banner: "bg-eo-red-solid text-eo-on-color",
  },
  p1: {
    name: "Blue",
    column: "bg-eo-blue-soft",
    activeEdge: "border-b-eo-blue-solid",
    youPill: "bg-eo-blue-solid",
    scored: "bg-eo-blue-soft text-eo-blue-ink",
    open: "cursor-pointer bg-eo-blue-solid/20 text-eo-blue-ink hover:bg-eo-blue-solid/35",
    nameText: "text-eo-blue-ink",
    totalText: "text-eo-blue-solid",
    dieBorder: "border-eo-blue-solid",
    dieEdge: "shadow-eo-edge-blue",
    rollVariant: "primary",
    banner: "bg-eo-blue-solid text-eo-on-color",
  },
};

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

const YouTag = ({ className }: { className: string }) => (
  <span
    className={cx(
      "rounded-eo-pill px-2.5 py-0.5 font-eo-body text-[10px] font-semibold tracking-eo-caps uppercase",
      className,
    )}
  >
    You
  </span>
);

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
    type="button"
    disabled={disabled}
    onClick={onToggle}
    aria-label={`Die showing ${value}${held ? ", held" : ""}`}
    aria-pressed={held}
    className={cx(
      "grid shrink-0 place-items-center rounded-eo-md border-2 bg-eo-card transition-[transform,box-shadow,opacity] duration-(--eo-duration-fast) ease-eo-out enabled:cursor-pointer enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:cursor-not-allowed",
      large ? "size-16 p-2.5" : "size-14 p-[9px]",
      held ? cx(SEATS[turn].dieBorder, SEATS[turn].dieEdge) : "border-eo-strong shadow-eo-edge-ink",
      dimmed && "opacity-45",
    )}
  >
    <GameAsset
      manifest={assets}
      slot={`die-${value}`}
      alt={`Die showing ${value}`}
      className="size-full"
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
  <div className={cx("flex flex-wrap justify-center", large ? "gap-3" : "gap-2")}>
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
  </div>
);

const RollPips = ({ used, spentText }: { used: number; spentText: string }) => (
  <Flex gap="6px" align="center">
    {[1, 2, 3].map((n) => (
      <Flex
        key={n}
        align="center"
        justify="center"
        shrink={0}
        className={cx(
          "size-6 rounded-full border-2 border-eo-on-color font-eo-body text-[12px] font-extrabold tabular-nums leading-none",
          n <= used ? cx("bg-eo-on-color", spentText) : "text-eo-on-color",
        )}
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
      type="button"
      disabled={!open}
      onClick={() => onScore(category)}
      aria-label={`${CATEGORY_INFO[category].label}, ${seat.name}`}
      className={cx(
        "min-h-14 border-l border-eo-hairline font-eo-body text-base font-extrabold tabular-nums transition-colors duration-(--eo-duration-fast) ease-eo-out",
        recorded !== undefined ? seat.scored : open ? seat.open : seat.column,
      )}
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
      <div
        className="flex min-w-0 items-center gap-1 px-4 py-2 text-eo-body"
        title={CATEGORY_INFO[category].description}
      >
        {CATEGORY_ICONS[category].map((glyph, index) => (
          <Icon key={index} icon={glyph} size={CATEGORY_ICONS[category].length === 1 ? 28 : 22} />
        ))}
      </div>
      {PLAYERS.map((player) => (
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
        {PLAYERS.map((player) => (
          <div
            key={player}
            className={cx(
              "grid min-h-13 place-items-center border-l border-b-[3px] border-eo-hairline",
              SEATS[player].column,
              live && player === currentPlayer ? SEATS[player].activeEdge : "border-b-transparent",
            )}
          >
            {player === seat && (
              <YouTag className={cx(SEATS[player].youPill, "text-eo-on-color")} />
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
  onExit,
}: {
  snapshot: Snapshot<YahtzeeState>;
  seat: PlayerId | null;
  onAction: (action: YahtzeeAction) => void;
  onExit: () => void;
}) => {
  const state = snapshot.state;
  const result = snapshot.result;
  const live = snapshot.phase === "playing";
  const yourTurn = seat !== null && snapshot.currentPlayer === seat;
  const myTurn = live && yourTurn;
  const rollsUsed = 3 - state.rollsLeft;
  const selectable =
    myTurn && rollsUsed > 0 && seat !== null ? legalScoringCategories(state, seat) : [];

  const totals: Record<PlayerId, number> = {
    p0: totalScore(state.scores.p0),
    p1: totalScore(state.scores.p1),
  };

  const current = SEATS[snapshot.currentPlayer];

  const rollLabel = yourTurn && result === null ? "Roll" : null;

  const winner = result !== null && !("draw" in result) ? result.winner : null;

  const rollButton = (size: "md" | "lg") => (
    <Button
      fullWidth
      size={size}
      variant={current.rollVariant}
      disabled={!myTurn || state.rollsLeft === 0}
      onClick={() => onAction({ type: "ROLL" })}
      iconRight={
        <RollPips used={rollsUsed} spentText={current.totalText} />
      }
    >
      {rollLabel}
    </Button>
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="font-eo-display text-eo-display-s tracking-eo-tight text-eo-strong">
          Yahtzee
        </h1>
        <span className="flex-1 max-[680px]:hidden" />

        <div className="flex flex-none justify-center max-[680px]:order-10 max-[680px]:w-full">
          <div className="flex items-center gap-3 rounded-eo-pill border-2 border-eo-strong bg-eo-card px-5 py-2 shadow-eo-sm">
            <span className={cx("font-eo-display text-[15px] font-semibold", SEATS.p0.nameText)}>
              Red
            </span>
            {seat === "p0" && <YouTag className="bg-eo-inverse text-eo-on-inverse" />}
            <span className="font-eo-body text-[22px] font-extrabold tabular-nums">
              <span className={SEATS.p0.totalText}>{totals.p0}</span>
              <span className="text-eo-muted"> – </span>
              <span className={SEATS.p1.totalText}>{totals.p1}</span>
            </span>
            {seat === "p1" && <YouTag className="bg-eo-inverse text-eo-on-inverse" />}
            <span className={cx("font-eo-display text-[15px] font-semibold", SEATS.p1.nameText)}>
              Blue
            </span>
          </div>
        </div>

        <span className="flex-1 max-[680px]:hidden" />

        <Button
          variant="outline"
          size="sm"
          className="max-[680px]:ml-auto"
          iconLeft={<Icon icon={LogOut} size={16} />}
          onClick={onExit}
        >
          Exit
        </Button>
      </div>

      {result !== null && (
        <div
          className={cx(
            "mb-6 rounded-eo-xl px-6 py-8 text-center max-md:px-4 max-md:py-6",
            winner === null ? "bg-eo-inverse text-eo-on-inverse" : SEATS[winner].banner,
          )}
        >
          <span className="font-eo-body text-eo-caption tracking-eo-caps uppercase opacity-85">
            Yahtzee
          </span>
          <h2 className="mt-3 mb-2 font-eo-display text-eo-display-m tracking-eo-tight">
            {winner === null ? "Draw" : `${SEATS[winner].name} wins`}
          </h2>
          <p className="font-eo-body text-eo-body-m opacity-90">
            {totals.p0}–{totals.p1}
            {winner !== null && result.reason !== undefined && ` · ${result.reason}`}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-6">
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
          <Card tone="outlined" className="grid gap-5">
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
      </div>

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
