"use client";

import type { PlayerId, Snapshot } from "@even-odds/game-sdk";
import { GameAsset } from "@even-odds/game-sdk/ui";
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
  p0: "text-eo-red",
  p1: "text-eo-blue",
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
      <span key={cell} className={PIPS[value]?.includes(cell) ? "rounded-full bg-eo-ink" : ""} />
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
    className={`rounded-xl p-3 transition-all duration-150 disabled:cursor-not-allowed max-md:p-2 ${
      held
        ? "bg-eo-gold ring-2 ring-eo-gold shadow-lg -translate-y-1"
        : "bg-eo-text hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
    }`}
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
        className={`flex w-full items-baseline justify-between rounded-md px-3 py-1.5 text-left text-sm transition-colors duration-100 ${
          open
            ? "cursor-pointer bg-eo-raised hover:bg-eo-gold hover:text-eo-ink"
            : "cursor-default"
        }`}
      >
        <span className={recorded === undefined ? "text-eo-muted" : "text-eo-text"}>
          {CATEGORY_INFO[category].label}
        </span>
        <span
          className={`font-display tabular-nums ${
            recorded !== undefined ? "text-eo-text" : open ? "font-semibold" : "text-eo-muted/40"
          }`}
        >
          {recorded ?? (preview === null ? "—" : `+${preview}`)}
        </span>
      </button>
    );
  };

  return (
    <section className="rounded-xl border border-eo-raised bg-eo-surface p-4 max-md:p-3">
      <header className="mb-3 flex items-baseline justify-between border-b border-eo-raised pb-2 max-lg:mb-0 max-lg:border-b-0 max-md:mb-3 max-md:border-b">
        <h2 className={`font-display font-bold ${SEAT_TEXT[player]}`}>
          {SEAT_NAME[player]}
          {isViewer && <span className="ml-2 text-xs text-eo-muted">you</span>}
        </h2>
        <span className="font-display text-xl font-bold tabular-nums text-eo-text">
          {totalScore(scores, bonus)}
        </span>
      </header>

      {/* 768–1023px: the card collapses to this one-line bar */}
      <p className="hidden items-baseline justify-between text-xs text-eo-muted max-lg:flex max-md:hidden">
        <span>Upper {upper}/63</span>
        <span>{filled}/11 filled</span>
      </p>

      <div className="max-lg:hidden max-md:block max-md:max-h-72 max-md:overflow-y-auto">
        <div className="space-y-0.5">{UPPER_CATEGORIES.map(row)}</div>

        <div className="my-2 flex items-baseline justify-between border-y border-eo-raised px-3 py-1.5 text-xs">
          <span className="text-eo-muted">Upper bonus {upper >= 63 ? "" : `(${upper}/63)`}</span>
          <span
            className={`font-display tabular-nums ${upper >= 63 ? "text-eo-gold" : "text-eo-muted"}`}
          >
            {upper >= 63 ? "+35" : "—"}
          </span>
        </div>

        <div className="space-y-0.5">{LOWER_CATEGORIES.map(row)}</div>

        {bonus > 0 && (
          <div className="mt-2 flex items-baseline justify-between rounded-md bg-eo-violet/20 px-3 py-1.5 text-xs">
            <span className="text-eo-violet">Yahtzee bonus</span>
            <span className="font-display tabular-nums text-eo-violet">+{bonus}</span>
          </div>
        )}
      </div>
    </section>
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

      <section className="flex w-80 flex-col items-center gap-6 rounded-xl border border-eo-raised bg-eo-surface p-6 max-lg:w-full max-md:gap-4 max-md:p-4">
        <p className="text-center text-sm">
          {snapshot.result ? (
            <span className="font-display text-eo-gold">Final</span>
          ) : myTurn ? (
            <span className="font-display font-semibold text-eo-text">Your turn</span>
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

        <button
          type="button"
          disabled={!myTurn || state.rollsLeft === 0}
          onClick={() => onAction({ type: "ROLL" })}
          className="w-full rounded-lg bg-eo-red px-6 py-3 font-display font-bold text-eo-text transition-colors duration-150 hover:brightness-110 disabled:bg-eo-raised disabled:text-eo-muted"
        >
          {state.rollsLeft === 0 ? "Pick a category" : `Roll · ${state.rollsLeft} left`}
        </button>

        <p className="text-center text-xs text-eo-muted">
          {rolled ? "Click dice to hold them" : "Roll to start your turn"}
        </p>
      </section>

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
