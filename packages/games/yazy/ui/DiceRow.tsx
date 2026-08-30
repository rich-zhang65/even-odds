"use client";

import { useEffect, useState } from "react";
import type { PlayerId } from "@even-odds/game-sdk";
import { Flex } from "@even-odds/design-system/ui";
import type { YazyAction, YazyState } from "../src/types";
import { Die } from "./Die";

const ROLL_MS = 700;
const STAGGER_MS = 50;
const SHUFFLE_MS = 70;

/* A face to show mid-tumble. Derived rather than random so it needs no state of
   its own, and offset by the die's index so the five never land in step. */
const spinningFace = (tick: number, index: number): number => 1 + ((tick * 3 + index * 5) % 6);

export const DiceRow = ({
  state,
  turn,
  disabled,
  large,
  onAction,
}: {
  state: YazyState;
  turn: PlayerId;
  disabled: boolean;
  large: boolean;
  onAction: (action: YazyAction) => void;
}) => {
  const [seen, setSeen] = useState(state.rollsLeft);
  const [rolls, setRolls] = useState(0);
  const [settled, setSettled] = useState(0);
  const [tick, setTick] = useState(0);

  /* Adjusting state during render rather than in an effect, which is what React
     prescribes for reacting to a changed prop. Watching rollsLeft fall is what
     tells a roll apart from a new turn, which resets it upward. */
  if (state.rollsLeft !== seen) {
    setSeen(state.rollsLeft);
    if (state.rollsLeft < seen) setRolls(rolls + 1);
  }

  const rolling = rolls > settled;
  const count = state.dice.length;

  /* The server sends the rolled values already settled, so the tumble plays over
     the top of them. An effect is the only way in: the roll that has to animate
     is just as often the opponent's, arriving over the socket with no local
     event to hang a timer on. */
  useEffect(() => {
    if (!rolling) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shuffle = still ? null : setInterval(() => setTick((t) => t + 1), SHUFFLE_MS);
    const settle = setTimeout(
      () => setSettled(rolls),
      still ? 0 : ROLL_MS + (count - 1) * STAGGER_MS,
    );

    return () => {
      if (shuffle !== null) clearInterval(shuffle);
      clearTimeout(settle);
    };
  }, [rolling, rolls, count]);

  return (
    <Flex wrap="wrap" justify="center" gap={large ? "12px" : "8px"}>
      {state.dice.map((value, index) => {
        const held = state.held[index] === true;
        const tumbling = rolling && !held;

        return (
          <Die
            key={index}
            value={tumbling && tick > 0 ? spinningFace(tick, index) : value}
            held={held}
            turn={turn}
            dimmed={state.rollsLeft === 3}
            disabled={disabled || state.rollsLeft === 3}
            large={large}
            rolling={tumbling}
            delayMs={index * STAGGER_MS}
            onToggle={() => onAction({ type: "TOGGLE_HOLD", index })}
          />
        );
      })}
    </Flex>
  );
};
