'use client';

import { useState } from 'react';
import { cellsOf, fleetProblem, placementProblem, shipAt } from '../src/logic';
import { BOARD, FLEET } from '../src/types';
import type { Cell, Facing, Ship, ShipId } from '../src/types';

/* How far the pointer travels before a press becomes a drag. Below it the press
   is a click, and a click on a placed ship turns it. */
const SLOP = 4;

/* A ship on its way somewhere. `grab` is which of its cells the pointer holds,
   so the ship moves under the finger rather than snapping its bow to it. */
type Drag = { id: ShipId; facing: Facing; grab: number; over: Cell | null };

type Point = { clientX: number; clientY: number; button: number };

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

const bowFor = (over: Cell, facing: Facing, grab: number): Cell =>
  facing === 'across'
    ? { x: over.x - grab, y: over.y }
    : { x: over.x, y: over.y - grab };

/* The square of your own waters under the pointer, if any. Read off the page
   rather than worked out from a rectangle, because a drag can start in the tray
   below the grid and the grid has no say in where the pointer goes. */
const cellUnder = (x: number, y: number): Cell | null => {
  const square = document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>('[data-drop-x]');
  if (square === null || square === undefined) return null;

  const cell = {
    x: Number(square.dataset.dropX),
    y: Number(square.dataset.dropY),
  };
  return Number.isInteger(cell.x) && Number.isInteger(cell.y) ? cell : null;
};

/* The click a browser sends after a drag that ends where it began would turn
   the ship just put down, so the one straight after a drag is swallowed. It
   arrives in the same task as the pointerup, so anything later is let through. */
const swallowNextClick = (): void => {
  const swallow = (event: MouseEvent): void => {
    event.stopPropagation();
    event.preventDefault();
  };
  window.addEventListener('click', swallow, { capture: true, once: true });
  setTimeout(() => {
    window.removeEventListener('click', swallow, { capture: true });
  }, 0);
};

/* A fleet the player arranges locally. None of it reaches the server until they
   are ready: arranging is a hundred small decisions and not one of them is a
   move, so the waiting player can lay their ships out while the other deploys
   and send it the moment the turn comes round. */
export const useFleet = () => {
  const [ships, setShips] = useState<Ship[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);

  /* Listeners go on the window for the length of one drag, so the ship follows
     the pointer off the grid and back. Everything the drop needs lives in this
     closure; state is only written for the render. */
  const pickUp = (
    id: ShipId,
    facing: Facing,
    grab: number,
    start: Point,
  ): void => {
    if (start.button !== 0) return;

    const others = ships.filter((ship) => ship.id !== id);
    let moved = false;
    let over: Cell | null = null;

    const move = (event: PointerEvent): void => {
      const travel = Math.hypot(
        event.clientX - start.clientX,
        event.clientY - start.clientY,
      );
      if (!moved && travel < SLOP) return;

      moved = true;
      over = cellUnder(event.clientX, event.clientY);
      setDrag({ id, facing, grab, over });
    };

    const stop = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', drop);
      window.removeEventListener('pointercancel', stop);
      setDrag(null);
    };

    // Anywhere it does not fit, the ship goes back where it came from.
    const drop = (): void => {
      stop();
      if (!moved) return;
      swallowNextClick();
      if (over === null) return;

      const ship: Ship = { id, at: bowFor(over, facing, grab), facing };
      if (placementProblem(others, ship) === null) {
        setShips([...others, ship]);
      }
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', drop);
    window.addEventListener('pointercancel', stop);
  };

  const landing =
    drag === null || drag.over === null
      ? null
      : {
          id: drag.id,
          at: bowFor(drag.over, drag.facing, drag.grab),
          facing: drag.facing,
        };
  const afloat =
    drag === null ? ships : ships.filter((ship) => ship.id !== drag.id);

  return {
    // What to draw: a ship being dragged leaves its old spot empty.
    ships: afloat,
    problem: fleetProblem(ships),
    ashore: FLEET.filter(
      (entry) => !ships.some((ship) => ship.id === entry.id),
    ),

    preview: landing === null ? [] : cellsOf(landing),
    previewBad: landing !== null && placementProblem(afloat, landing) !== null,

    // A press on a ship in the water, held by whichever cell was pressed.
    grabAt: (at: Cell, start: Point): void => {
      const ship = shipAt(ships, at);
      if (ship === undefined) return;
      const grab = cellsOf(ship).findIndex(
        (part) => part.x === at.x && part.y === at.y,
      );
      pickUp(ship.id, ship.facing, grab, start);
    },

    // A press on a ship still ashore, which comes off the tray lying across.
    launch: (id: ShipId, start: Point): void => {
      pickUp(id, 'across', 0, start);
    },

    /* Turned about its bow. Where that would run it off the board or into
       another ship, it stays as it is. */
    turn: (at: Cell): void => {
      const ship = shipAt(ships, at);
      if (ship === undefined) return;

      const turned: Ship = {
        ...ship,
        facing: ship.facing === 'across' ? 'down' : 'across',
      };
      const others = ships.filter((other) => other.id !== ship.id);
      if (placementProblem(others, turned) !== null) return;

      setShips(ships.map((other) => (other.id === ship.id ? turned : other)));
    },

    scatter: (): void => {
      for (let go = 0; go < 20; go++) {
        const placed = attempt();
        if (placed.length === FLEET.length) {
          setShips(placed);
          return;
        }
      }
    },

    clear: (): void => setShips([]),
  };
};
