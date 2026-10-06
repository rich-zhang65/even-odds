'use client';

import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  fleetProblem,
  lengthOf,
  placementProblem,
  turnShip,
} from '../src/logic';
import { BOARD, FLEET } from '../src/types';
import type { Cell, Facing, Ship, ShipId } from '../src/types';

/* How far the pointer travels before a press becomes a drag. Below it the press
   is a tap, and a tap turns the ship. */
const SLOP = 6;

/* Every ship the player owns, in the water or still in the dock. A docked ship
   always lies across, and goes back to lying across when returned. */
export type Piece = { id: ShipId; facing: Facing; at: Cell | null };

/* A ship on its way somewhere, drawn as a ghost under the pointer. The ghost
   keeps the spot it was grabbed by, and `landing` is the square its bow would
   snap to, or null where it cannot go. `docking` is whether letting go now
   sends it back to the dock. */
export type Drag = {
  id: ShipId;
  facing: Facing;
  left: number;
  top: number;
  width: number;
  height: number;
  landing: Cell | null;
  docking: boolean;
};

const ASHORE: Piece[] = FLEET.map(({ id }) => ({
  id,
  facing: 'across',
  at: null,
}));

const afloat = (pieces: Piece[]): Ship[] => {
  const ships: Ship[] = [];
  for (const { id, facing, at } of pieces) {
    if (at !== null) ships.push({ id, facing, at });
  }
  return ships;
};

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

/* Whether the pointer is over a dock, which takes a ship back off the board. A
   dock hidden at this screen width is never hit, so either layout's works. */
const overDock = (x: number, y: number): boolean =>
  document.elementFromPoint(x, y)?.closest('[data-dock]') != null;

/* A fleet the player arranges locally. None of it reaches the server until they
   deploy: arranging is a hundred small decisions and not one of them is a move. */
export const useFleet = () => {
  const [pieces, setPieces] = useState<Piece[]>(ASHORE);
  const [drag, setDrag] = useState<Drag | null>(null);
  // The board ships snap to, measured when a drag needs it.
  const water = useRef<HTMLDivElement>(null);

  const ships = afloat(pieces);

  const update = (id: ShipId, change: { facing?: Facing; at?: Cell | null }) =>
    setPieces(
      pieces.map((piece) =>
        piece.id === id ? { ...piece, ...change } : piece,
      ),
    );

  /* Turned about `pivot`, the square tapped, counted from the bow; turnShip
     finds room nearby when that exact spot is taken. Only a ship in the water
     turns. */
  const turn = (id: ShipId, pivot: number): void => {
    const ship = ships.find((each) => each.id === id);
    if (ship === undefined) return;

    const others = ships.filter((other) => other.id !== id);
    const turned = turnShip(others, ship, pivot);
    if (turned !== null) update(id, turned);
  };

  /* Listeners go on the window for the length of one press, so the ship follows
     the pointer off the board and back. What the drop needs lives in this
     closure; state is only written for the render. */
  const press = (id: ShipId, event: ReactPointerEvent<HTMLElement>): void => {
    if (event.button !== 0) return;
    const board = water.current;
    const piece = pieces.find((each) => each.id === id);
    if (board === null || piece === undefined) return;
    event.preventDefault();

    const cell = board.getBoundingClientRect().width / BOARD;
    const length = lengthOf(id);
    const width = (piece.facing === 'across' ? length : 1) * cell;
    const height = (piece.facing === 'across' ? 1 : length) * cell;

    /* Held at the same fraction along the ship as it was grabbed, so leaving
       the smaller dock does not make the ghost jump. */
    const pressed = event.currentTarget.getBoundingClientRect();
    const grabX = ((event.clientX - pressed.left) / pressed.width) * width;
    const grabY = ((event.clientY - pressed.top) / pressed.height) * height;
    const startX = event.clientX;
    const startY = event.clientY;

    const others = ships.filter((ship) => ship.id !== id);
    let moved = false;
    let landing: Cell | null = null;

    const move = (moving: PointerEvent): void => {
      const travel = Math.hypot(
        moving.clientX - startX,
        moving.clientY - startY,
      );
      if (!moved && travel < SLOP) return;
      moved = true;

      const left = moving.clientX - grabX;
      const top = moving.clientY - grabY;
      const grid = board.getBoundingClientRect();
      const at = {
        x: Math.round((left - grid.left) / cell),
        y: Math.round((top - grid.top) / cell),
      };
      /* Over the dock means back to the dock, even where the board runs on
         underneath it: below 800px the dock is a tray fixed over the bottom
         of the page, and the board's lower rows can sit right behind it. */
      const docking = overDock(moving.clientX, moving.clientY);
      landing =
        !docking &&
        placementProblem(others, { id, facing: piece.facing, at }) === null
          ? at
          : null;

      setDrag({
        id,
        facing: piece.facing,
        left,
        top,
        width,
        height,
        landing,
        docking,
      });
    };

    const stop = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', drop);
      window.removeEventListener('pointercancel', stop);
      setDrag(null);
    };

    // Anywhere it cannot go, the ship goes back where it came from.
    const drop = (up: PointerEvent): void => {
      stop();
      if (!moved) {
        // The square under the press, along the ship from its bow.
        const along = piece.facing === 'across' ? grabX : grabY;
        turn(id, Math.min(length - 1, Math.max(0, Math.floor(along / cell))));
      } else if (overDock(up.clientX, up.clientY)) {
        update(id, { at: null, facing: 'across' });
      } else if (landing !== null) {
        update(id, { at: landing });
      }
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', drop);
    window.addEventListener('pointercancel', stop);
  };

  return {
    pieces,
    ships,
    drag,
    water,
    problem: fleetProblem(ships),

    press,

    // Enter or Space turns a ship, the keyboard's version of a tap.
    key: (id: ShipId, event: KeyboardEvent<HTMLElement>): void => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      turn(id, Math.floor((lengthOf(id) - 1) / 2));
    },

    /* Puts back a fleet that was sent and then taken back, so cancelling a
       deploy returns the layout rather than an empty dock. */
    restore: (sent: Ship[]): void => {
      setPieces(
        ASHORE.map(
          (piece) => sent.find((ship) => ship.id === piece.id) ?? piece,
        ),
      );
    },

    shuffle: (): void => {
      for (let go = 0; go < 20; go++) {
        const placed = attempt();
        if (placed.length === FLEET.length) {
          setPieces(placed);
          return;
        }
      }
    },
  };
};
