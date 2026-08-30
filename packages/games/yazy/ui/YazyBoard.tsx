"use client";

import type { PlayerId, Snapshot } from "@even-odds/game-sdk";
import { SEATS } from "@even-odds/game-sdk/ui";
import { Button, Card, Flex } from "@even-odds/design-system/ui";
import type { YazyAction, YazyState } from "../src/types";
import { legalScoringCategories } from "../src/logic";
import { DiceRow } from "./DiceRow";
import { RollPips } from "./RollPips";
import { Scorecard } from "./Scorecard";

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
