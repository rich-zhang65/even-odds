import type { PlayerId } from "@even-odds/game-sdk";
import { Flex } from "@even-odds/design-system/ui";
import type { YazyAction, YazyState } from "../src/types";
import { Die } from "./Die";
import { STAGGER_MS } from "./useRoll";

/* A face to show mid-tumble. Derived rather than random so it needs no state of
   its own, and offset by the die's index so the five never land in step. */
const spinningFace = (tick: number, index: number): number => 1 + ((tick * 3 + index * 5) % 6);

export const DiceRow = ({
  state,
  turn,
  disabled,
  large,
  rolling,
  tick,
  onAction,
}: {
  state: YazyState;
  turn: PlayerId;
  disabled: boolean;
  large: boolean;
  rolling: boolean;
  tick: number;
  onAction: (action: YazyAction) => void;
}) => (
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
