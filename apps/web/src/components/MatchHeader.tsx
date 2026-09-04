"use client";

import { LogOut } from "lucide-react";
import type { GameResult, PlayerId } from "@even-odds/game-sdk";
import { SEATS, YouTag } from "@even-odds/game-sdk/ui";
import { Button, Flex, Icon, cx } from "@even-odds/design-system/ui";

/* Title, running score, exit and the result banner: the shell every match wears,
   whatever game is inside it. Scores arrive as numbers because only the game
   knows how to add them up. */
export const MatchHeader = ({
  title,
  totals,
  seat,
  result,
  onExit,
}: {
  title: string;
  totals: Record<PlayerId, number>;
  seat: PlayerId | null;
  result: GameResult | null;
  onExit: () => void;
}) => {
  const winner = result !== null && !("draw" in result) ? result.winner : null;

  return (
    <>
      <Flex className="mb-5" wrap="wrap" align="center" gap="12px">
        <h1 className="font-eo-display text-eo-display-s tracking-eo-tight text-eo-strong">
          {title}
        </h1>

        <span className="flex-1 max-[680px]:hidden" />

        <Flex className="max-[680px]:order-10 max-[680px]:w-full" justify="center" shrink={0}>
          {/* A control height rather than padding, so the pill and the Exit button
              are the same 44px and the row reads as one band. Left to size itself,
              the pill came out ~50px against a 36px button: both centred, but with
              7px of air above and below the button, which reads as the two being
              out of line rather than as a size difference. */}
          <Flex
            className="h-(--eo-control-md) select-none rounded-eo-pill border-2 border-eo-strong bg-eo-card px-5 shadow-eo-sm"
            align="center"
            gap="12px"
          >
            <span className={cx("font-eo-display text-[15px] font-semibold", SEATS.p0.ink)}>
              {SEATS.p0.name}
            </span>
            {seat === "p0" && <YouTag className="bg-eo-inverse text-eo-on-inverse" />}
            <span className="font-eo-body text-[22px] font-extrabold tabular-nums">
              <span className={SEATS.p0.accent}>{totals.p0}</span>
              <span className="text-eo-muted"> – </span>
              <span className={SEATS.p1.accent}>{totals.p1}</span>
            </span>
            {seat === "p1" && <YouTag className="bg-eo-inverse text-eo-on-inverse" />}
            <span className={cx("font-eo-display text-[15px] font-semibold", SEATS.p1.ink)}>
              {SEATS.p1.name}
            </span>
          </Flex>
        </Flex>

        <span className="flex-1 max-[680px]:hidden" />

        <Button
          className="max-[680px]:ml-auto"
          variant="outline"
          size="md"
          iconLeft={<Icon icon={LogOut} size={16} />}
          onClick={onExit}
        >
          Exit
        </Button>
      </Flex>

      {result !== null && (
        <div
          className={cx(
            "mb-6 rounded-eo-xl px-6 py-8 text-center max-md:px-4 max-md:py-6",
            winner === null
              ? "bg-eo-inverse text-eo-on-inverse"
              : cx(SEATS[winner].solid, "text-eo-on-color"),
          )}
        >
          <span className="font-eo-body text-eo-caption tracking-eo-caps uppercase opacity-85">
            {title}
          </span>
          <h2 className="mt-3 mb-2 font-eo-display text-eo-display-m tracking-eo-tight">
            {winner === null ? "Draw" : `${SEATS[winner].name} wins`}
          </h2>
          <p className="font-eo-body text-eo-body-m opacity-90">
            {totals.p0}–{totals.p1}
            {result.reason !== undefined && ` · ${result.reason}`}
          </p>
        </div>
      )}
    </>
  );
};
