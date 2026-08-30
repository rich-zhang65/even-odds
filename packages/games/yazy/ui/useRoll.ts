"use client";

import { useEffect, useState } from "react";

const ROLL_MS = 700;
export const STAGGER_MS = 50;
const SHUFFLE_MS = 70;

/* Watches rollsLeft fall, which is what tells a roll apart from a new turn that
   resets it upward, and stays `rolling` for as long as the dice tumble. Lives
   above the board rather than inside DiceRow because the whole board has to wait
   on it -- the dice are not the only thing that would otherwise give the result
   away. An effect is the only way in: the roll that has to animate is just as
   often the opponent's, arriving over the socket with no local event to hang a
   timer on. */
export const useRoll = (rollsLeft: number, count: number): { rolling: boolean; tick: number } => {
  const [seen, setSeen] = useState(rollsLeft);
  const [rolls, setRolls] = useState(0);
  const [settled, setSettled] = useState(0);
  const [tick, setTick] = useState(0);

  if (rollsLeft !== seen) {
    setSeen(rollsLeft);
    if (rollsLeft < seen) setRolls(rolls + 1);
  }

  const rolling = rolls > settled;

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

  return { rolling, tick };
};
