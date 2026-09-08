import type { PlayerId } from "../src/types";

export type Point = { x: number; y: number };
export type Field = { width: number; height: number };

/* Both players look at the field from the near end, so p1's view is it turned
   around — not mirrored. Walking round to the far side puts your opponent's
   right on your left; a reflection would leave left where it is and quietly
   reverse the handedness of every bounce.

   The server never learns about any of this. It keeps one field with p0 at the
   bottom, and only the drawing and the pointer are turned.

   This is the position half of a pair: position follows the viewer, and colour
   follows the seat (see SEATS). Tying a colour to a position instead would
   undo it — p1 would look down at their opponent's colour. */
export const seenBy = (seat: PlayerId | null, at: Point, field: Field): Point =>
  seat === "p1" ? { x: field.width - at.x, y: field.height - at.y } : { ...at };

/* The same turn, undone: a pointer lands somewhere on the screen and has to
   become a place on the field the server agrees with. */
export const aimedAt = (seat: PlayerId | null, screenX: number, field: Field): number =>
  seat === "p1" ? field.width - screenX : screenX;
