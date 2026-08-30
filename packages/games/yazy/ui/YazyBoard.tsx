"use client";

import type { PlayerId, Snapshot } from "@even-odds/game-sdk";
import { SEATS } from "@even-odds/game-sdk/ui";
import { Button, Card, Flex } from "@even-odds/design-system/ui";
import type { YazyAction, YazyState } from "../src/types";
import { legalScoringCategories } from "../src/logic";
import { DiceRow } from "./DiceRow";
import { RollPips } from "./RollPips";
import { Scorecard } from "./Scorecard";
import { useRoll } from "./useRoll";

export const YazyBoard = ({
  snapshot,
  seat,
  onAction,
}: {
  snapshot: Snapshot<YazyState>;
  seat: PlayerId | null;
  onAction: (action: YazyAction) => void;
}) => {
  const state = snapshot.state;
  const result = snapshot.result;
  const live = snapshot.phase === "playing";
  const yourTurn = seat !== null && snapshot.currentPlayer === seat;
  const myTurn = live && yourTurn;
  const rollsUsed = 3 - state.rollsLeft;

  /* The rolled values arrive already settled, so every preview in the scorecard
     would spell out the result while the dice were still in the air. Only the
     numbers wait: the cells stay open through the tumble, so the column does not
     flash its tint off and back on with every roll.

     What is open follows the current player rather than the viewer, so a turn
     lights up its own available rows for both people the moment it starts. Acting
     on one still needs the seat and a roll -- SCORE is illegal at rollsLeft 3. */
  const { rolling, tick } = useRoll(state.rollsLeft, state.dice.length);
  const selectable =
    live && result === null ? legalScoringCategories(state, snapshot.currentPlayer) : [];
  const revealed = rollsUsed > 0 && !rolling;

  const current = SEATS[snapshot.currentPlayer];

  const rollLabel = yourTurn && result === null ? "Roll" : null;

  const rollButton = (size: "md" | "lg") => (
    <Button
      fullWidth
      size={size}
      variant={current.button}
      disabled={!myTurn || rolling || state.rollsLeft === 0}
      onClick={() => onAction({ type: "ROLL" })}
      iconRight={<RollPips used={rollsUsed} spentText={current.accent} />}
    >
      {rollLabel}
    </Button>
  );

  return (
    <div>
      <Flex wrap="wrap" align="start" gap="24px">
        <div className="min-w-0 flex-[1_1_400px]">
          <Scorecard
            state={state}
            seat={seat}
            currentPlayer={snapshot.currentPlayer}
            live={live}
            selectable={selectable}
            revealed={revealed}
            onScore={(category) => onAction({ type: "SCORE", category })}
          />
        </div>

        {/* Above 800px the dice sit in a sticky rail; below it they move to the
            fixed tray below, so the scorecard keeps the full width. The card's
            basis has to leave room for 288px of rail plus the gap inside the
            container at 800px -- flex wraps on the basis, before any shrinking,
            so an oversized basis drops the rail under the card in a band just
            above the breakpoint where the tray is already hidden. */}
        <div className="sticky top-6 flex-[0_0_288px] max-[800px]:hidden">
          <Card className="grid gap-5" tone="outlined">
            <DiceRow
              state={state}
              turn={snapshot.currentPlayer}
              disabled={!myTurn}
              large
              rolling={rolling}
              tick={tick}
              onAction={onAction}
            />
            {rollButton("lg")}
          </Card>
        </div>
      </Flex>

      <div className="h-39 min-[800px]:hidden" />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-eo-strong bg-eo-card px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] min-[800px]:hidden">
        <div className="mx-auto grid max-w-[312px] gap-3">
          <DiceRow
            state={state}
            turn={snapshot.currentPlayer}
            disabled={!myTurn}
            large={false}
            rolling={rolling}
            tick={tick}
            onAction={onAction}
          />
          {rollButton("md")}
        </div>
      </div>
    </div>
  );
};
