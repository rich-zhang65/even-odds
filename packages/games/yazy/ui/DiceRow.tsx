import type { PlayerId } from "@even-odds/game-sdk";
import { Flex } from "@even-odds/design-system/ui";
import type { YazyAction, YazyState } from "../src/types";
import { Die } from "./Die";

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
