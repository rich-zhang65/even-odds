import type { PlayerId } from "@even-odds/game-sdk";
import { TABLE } from "../src/types";
import type { Vec } from "../src/types";

/* Both players look at the table from the near end, so p1's view is the table
   turned around — not mirrored. Walking round to the far end puts your
   opponent's right on your left; a reflection would leave left where it is and
   quietly reverse the handedness of every bounce.

   The server never learns about any of this. It keeps one table with p0 at the
   bottom, and only the drawing and the pointer are turned. */
export const seenBy = (seat: PlayerId | null, at: Vec): Vec =>
  seat === "p1" ? { x: TABLE.width - at.x, y: TABLE.height - at.y } : { ...at };

/* The same turn, undone: a pointer lands somewhere on the screen and has to
   become a place on the table the server agrees with. */
export const aimedAt = (seat: PlayerId | null, screenX: number): number =>
  seat === "p1" ? TABLE.width - screenX : screenX;
