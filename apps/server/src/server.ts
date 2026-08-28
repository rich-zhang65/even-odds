import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { createRegistry } from "./matches";
import type { Match, Seat } from "./matches";
import { gameActionSchema, matchCreateSchema, matchJoinSchema } from "./protocol";
import type { ClientToServerEvents, MatchStatePayload, ServerToClientEvents } from "./protocol";

export type SocketServer = Server<ClientToServerEvents, ServerToClientEvents>;

export const attachSocketServer = (
  http: HttpServer,
  opts: { graceMs?: number } = {}
): SocketServer => {
  const io: SocketServer = new Server(http, { cors: { origin: "*" } });

  const registry = createRegistry((socketId, event) => {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) return;
    switch (event.type) {
      case "state":
        socket.emit("game:state", { snapshot: event.snapshot });
        return;
      case "over":
        socket.emit("game:over", { result: event.result });
        return;
      case "opponent":
        socket.emit("match:opponent", { connected: event.connected });
        return;
    }
  }, opts);

  const isConnected = (seat: Seat | null): boolean => seat !== null && seat.socketId !== null;

  const broadcastMatchState = (match: Match): void => {
    const payload: MatchStatePayload = {
      matchId: match.id,
      gameId: match.gameId,
      seats: { p0: isConnected(match.seats.p0), p1: isConnected(match.seats.p1) },
    };
    for (const player of ["p0", "p1"] as const) {
      const socketId = match.seats[player]?.socketId;
      if (socketId) io.sockets.sockets.get(socketId)?.emit("match:state", payload);
    }
  };

  io.on("connection", (socket) => {
    socket.on("match:create", (raw, ack) => {
      const parsed = matchCreateSchema.safeParse(raw);
      if (!parsed.success) {
        ack({ error: "bad-payload" });
        return;
      }

      const result = registry.create(parsed.data.gameId, socket.id);
      if (!result.ok) {
        ack({ error: result.error });
        return;
      }

      ack({ matchId: result.matchId, you: result.you, token: result.token });
      const match = registry.get(result.matchId);
      if (match) broadcastMatchState(match);
    });

    socket.on("match:join", (raw, ack) => {
      const parsed = matchJoinSchema.safeParse(raw);
      if (!parsed.success) {
        ack({ error: "bad-payload" });
        return;
      }

      const result = registry.join(parsed.data.matchId, socket.id, parsed.data.token);
      if (!result.ok) {
        ack({ error: result.error });
        return;
      }

      ack({
        matchId: result.matchId,
        you: result.you,
        token: result.token,
        reconnected: result.reconnected,
      });

      const match = registry.get(result.matchId);
      if (match) broadcastMatchState(match);
      registry.activate(socket.id, result.reconnected);
    });

    socket.on("game:action", (raw, ack) => {
      const parsed = gameActionSchema.safeParse(raw);
      if (!parsed.success) {
        ack({ error: "bad-payload" });
        return;
      }
      const outcome = registry.action(socket.id, parsed.data);
      ack(outcome.ok ? { ok: true } : { error: outcome.error });
    });

    socket.on("match:leave", () => {
      const match = registry.release(socket.id);
      if (match) broadcastMatchState(match);
    });

    socket.on("disconnect", () => {
      const match = registry.release(socket.id);
      if (match) broadcastMatchState(match);
    });
  });

  return io;
};
