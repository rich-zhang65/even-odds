'use client';

import { useState } from 'react';
import { fleetProblem, placementProblem, shipAt } from '../src/logic';
import { BOARD, FLEET } from '../src/types';
import type { Cell, Facing, Ship, ShipId } from '../src/types';

const stillAshore = (ships: Ship[]): ShipId | null =>
  FLEET.find((entry) => !ships.some((ship) => ship.id === entry.id))?.id ??
  null;

const anywhere = (): Cell => ({
  x: Math.floor(Math.random() * BOARD),
  y: Math.floor(Math.random() * BOARD),
});

/* One attempt at a whole fleet. Random placement can paint itself into a corner
   and leave a ship with nowhere legal to go, so the caller retries rather than
   handing back something short. */
const attempt = (): Ship[] => {
  const placed: Ship[] = [];
  for (const { id } of FLEET) {
    for (let tries = 0; tries < 200; tries++) {
      const ship: Ship = {
        id,
        at: anywhere(),
        facing: Math.random() < 0.5 ? 'across' : 'down',
      };
      if (placementProblem(placed, ship) === null) {
        placed.push(ship);
        break;
      }
    }
  }
  return placed;
};

/* A fleet the player arranges locally. None of it reaches the server until they
   are ready: arranging is a hundred small decisions and not one of them is a
   move, so the waiting player can lay their ships out while the other deploys
   and send it the moment the turn comes round. */
export const useFleet = () => {
  const [ships, setShips] = useState<Ship[]>([]);
  const [holding, setHolding] = useState<ShipId | null>(FLEET[0].id);
  const [facing, setFacing] = useState<Facing>('across');

  const take = (id: ShipId): void => {
    setShips(ships.filter((ship) => ship.id !== id));
    setHolding(id);
  };

  return {
    ships,
    holding,
    facing,
    problem: fleetProblem(ships),

    take,

    /* A square with a ship on it gives the ship back rather than refusing the
       click, so moving one is pick up and put down with nothing to learn. */
    put: (at: Cell): void => {
      const sitting = shipAt(ships, at);
      if (sitting !== undefined) {
        take(sitting.id);
        return;
      }
      if (holding === null) return;

      const others = ships.filter((ship) => ship.id !== holding);
      const ship: Ship = { id: holding, at, facing };
      if (placementProblem(others, ship) !== null) return;

      const next = [...others, ship];
      setShips(next);
      setHolding(stillAshore(next));
    },

    trouble: (at: Cell): boolean => {
      if (holding === null) return false;
      const others = ships.filter((ship) => ship.id !== holding);
      return placementProblem(others, { id: holding, at, facing }) !== null;
    },

    rotate: (): void => setFacing(facing === 'across' ? 'down' : 'across'),

    scatter: (): void => {
      for (let go = 0; go < 20; go++) {
        const placed = attempt();
        if (placed.length === FLEET.length) {
          setShips(placed);
          setHolding(null);
          return;
        }
      }
    },

    clear: (): void => {
      setShips([]);
      setHolding(FLEET[0].id);
    },
  };
};
