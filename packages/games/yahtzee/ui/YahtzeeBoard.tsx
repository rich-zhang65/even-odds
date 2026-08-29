"use client";

import type { PlayerId, Snapshot } from "@even-odds/game-sdk";
import { GameAsset } from "@even-odds/game-sdk/ui";
import { Button, Card, cx } from "@even-odds/design-system/ui";
import type { Category, YahtzeeAction, YahtzeeState } from "../src/types";
import { assets } from "../src/assets";
import { legalScoringCategories, previewScore } from "../src/logic";
import {
  ALL_CATEGORIES,
  CATEGORY_INFO,
  LOWER_CATEGORIES,
  UPPER_CATEGORIES,
  totalScore,
  upperSectionTotal,
} from "../src/scoring";

const SEAT_TEXT: Record<PlayerId, string> = {
  p0: "text-eo-red-ink",
  p1: "text-eo-blue-ink",
};

const SEAT_NAME: Record<PlayerId, string> = { p0: "Red", p1: "Blue" };

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const Pips = ({ value }: { value: number }) => (
  <span className="grid h-8 w-8 grid-cols-3 grid-rows-3 gap-0.5">
    {Array.from({ length: 9 }, (_, cell) => (
      <span key={cell} className={PIPS[value]?.includes(cell) ? "rounded-full bg-eo-strong" : ""} />
    ))}
  </span>
);

const Die = ({
  value,
  held,
  disabled,
  onToggle,
}: {
  value: number;
  held: boolean;
  disabled: boolean;
  onToggle: () => void;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onToggle}
    aria-label={`Die showing ${value}${held ? ", held" : ""}`}
    aria-pressed={held}
    className={cx(
      "cursor-pointer rounded-eo-md border-2 bg-eo-card p-3 transition-[transform,box-shadow] duration-(--eo-duration-fast) ease-eo-out disabled:cursor-not-allowed max-md:p-2",
      held
        ? "-translate-y-1 border-eo-strong shadow-eo-edge-ink"
        : "border-eo-hairline hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0",
    )}
  >
    <GameAsset
      manifest={assets}
      slot={`die-${value}`}
      alt={`Die showing ${value}`}
      className="h-8 w-8"
      fallback={<Pips value={value} />}
    />
  </button>
);

const Scorecard = ({
  player,
  state,
  isViewer,
  selectable,
  onScore,
}: {
  player: PlayerId;
  state: YahtzeeState;
  isViewer: boolean;
  selectable: Category[];
  onScore: (category: Category) => void;
}) => {
  const scores = state.scores[player];
  const upper = upperSectionTotal(scores);
  const bonus = state.yahtzeeBonus[player];
  const filled = ALL_CATEGORIES.filter(category => scores[category] !== undefined).length;

  const row = (category: Category) => {
    const recorded = scores[category];
    const open = selectable.includes(category);
    const preview = open ? previewScore(state, player, category) : null;

    return (
      <button
        key={category}
        type="button"
        disabled={!open}
        onClick={() => onScore(category)}
        title={CATEGORY_INFO[category].description}
        className={cx(
          "flex w-full items-baseline justify-between rounded-eo-sm px-3 py-1.5 text-left font-eo-body text-eo-body-s transition-colors duration-(--eo-duration-fast) ease-eo-out",
          open ? "cursor-pointer bg-eo-sunken hover:bg-eo-inverse hover:text-eo-on-inverse" : "cursor-default",
        )}
      >
        <span className={recorded === undefined ? "text-eo-muted" : "text-eo-strong"}>
          {CATEGORY_INFO[category].label}
        </span>
        <span
          className={cx(
            "font-eo-body tabular-nums",
            recorded !== undefined ? "text-eo-strong" : open ? "font-semibold" : "text-eo-faint",
          )}
        >
          {recorded ?? (preview === null ? "—" : `+${preview}`)}
        </span>
      </button>
    );
  };

  return (
    <Card className="p-4 max-md:p-3">
      <header className="mb-3 flex items-baseline justify-between border-b border-eo-hairline pb-2 max-lg:mb-0 max-lg:border-b-0 max-md:mb-3 max-md:border-b">
        <h2 className={cx("font-eo-display text-eo-title", SEAT_TEXT[player])}>
          {SEAT_NAME[player]}
          {isViewer && <span className="ml-2 font-eo-body text-eo-caption text-eo-muted">you</span>}
        </h2>
        <span className="font-eo-body text-eo-stat tabular-nums text-eo-strong">
          {totalScore(scores, bonus)}
        </span>
      </header>

      {/* 768–1023px: the card collapses to this one-line bar */}
      <p className="hidden items-baseline justify-between font-eo-body text-eo-caption text-eo-muted max-lg:flex max-md:hidden">
        <span>Upper {upper}/63</span>
        <span>{filled}/11 filled</span>
      </p>

      <div className="max-lg:hidden max-md:block max-md:max-h-72 max-md:overflow-y-auto">
        <div className="space-y-0.5">{UPPER_CATEGORIES.map(row)}</div>

        <div className="my-2 flex items-baseline justify-between border-y border-eo-hairline px-3 py-1.5 font-eo-body text-eo-caption">
          <span className="text-eo-muted">Upper bonus {upper >= 63 ? "" : `(${upper}/63)`}</span>
          <span
            className={cx("font-eo-body tabular-nums", upper >= 63 ? "text-eo-strong" : "text-eo-muted")}
          >
            {upper >= 63 ? "+35" : "—"}
          </span>
        </div>

        <div className="space-y-0.5">{LOWER_CATEGORIES.map(row)}</div>

        {bonus > 0 && (
          <div className="mt-2 flex items-baseline justify-between rounded-eo-sm bg-eo-sunken px-3 py-1.5 font-eo-body text-eo-caption">
            <span className="text-eo-body">Yahtzee bonus</span>
            <span className="tabular-nums text-eo-strong">+{bonus}</span>
          </div>
        )}
      </div>
    </Card>
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
  const live = snapshot.phase === "playing";
  const myTurn = live && seat !== null && snapshot.currentPlayer === seat;
  const rolled = state.rollsLeft < 3;
  const selectable = myTurn && rolled && seat !== null ? legalScoringCategories(state, seat) : [];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-6 max-lg:grid-cols-1 max-lg:gap-4">
      <Scorecard
        player="p0"
        state={state}
        isViewer={seat === "p0"}
        selectable={seat === "p0" ? selectable : []}
        onScore={(category) => onAction({ type: "SCORE", category })}
      />

      <Card className="flex w-80 flex-col items-center gap-6 max-lg:w-full max-md:gap-4 max-md:p-4">
        <p className="text-center font-eo-body text-eo-body-s">
          {snapshot.result ? (
            <span className="font-eo-display font-semibold text-eo-strong">Final</span>
          ) : myTurn ? (
            <span className="font-eo-display font-semibold text-eo-strong">Your turn</span>
          ) : (
            <span className="text-eo-muted">
              {SEAT_NAME[snapshot.currentPlayer]} is playing
            </span>
          )}
          <span className="ml-2 text-eo-muted">round {Math.min(state.round, 11)}/11</span>
        </p>

        <div className="flex gap-2 max-md:gap-1.5">
          {state.dice.map((value, index) => (
            <Die
              key={index}
              value={value}
              held={state.held[index] === true}
              disabled={!myTurn || !rolled}
              onToggle={() => onAction({ type: "TOGGLE_HOLD", index })}
            />
          ))}
        </div>

        <Button
          variant="red"
          size="lg"
          fullWidth
          disabled={!myTurn || state.rollsLeft === 0}
          onClick={() => onAction({ type: "ROLL" })}
        >
          {state.rollsLeft === 0 ? "Pick a category" : `Roll · ${state.rollsLeft} left`}
        </Button>

        <p className="text-center font-eo-body text-eo-caption text-eo-muted">
          {rolled ? "Click dice to hold them" : "Roll to start your turn"}
        </p>
      </Card>

      <Scorecard
        player="p1"
        state={state}
        isViewer={seat === "p1"}
        selectable={seat === "p1" ? selectable : []}
        onScore={(category) => onAction({ type: "SCORE", category })}
      />
    </div>
  );
};
