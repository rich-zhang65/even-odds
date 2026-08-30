import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { attachSocketServer } from "../../../../server/src/server";
import type { MatchStore } from "../matchStore";
import type { MatchSocket } from "../socket";

const cells = new Map<string, string>();

Object.defineProperty(globalThis, "sessionStorage", {
  value: {
    getItem: (key: string) => cells.get(key) ?? null,
    setItem: (key: string, value: string) => cells.set(key, value),
    removeItem: (key: string) => cells.delete(key),
    clear: () => cells.clear(),
  },
  configurable: true,
});

const http = createServer();
const io = attachSocketServer(http, { graceMs: 200 });

let getMatchStore: (matchId: string) => MatchStore;
let getSocket: () => MatchSocket;

beforeAll(async () => {
  await new Promise<void>(resolve => http.listen(0, () => resolve()));
  const address = http.address();
  if (address === null || typeof address === "string") throw new Error("no port bound");

  // socket.ts reads the URL at module scope, so the env has to be set before import.
  process.env.NEXT_PUBLIC_SERVER_URL = `http://127.0.0.1:${address.port}`;
  ({ getMatchStore } = await import("../matchStore"));
  ({ getSocket } = await import("../socket"));
});

afterAll(async () => {
  getSocket().disconnect();
  await new Promise<void>(resolve => io.close(() => resolve()));
});

const settle = () => new Promise<void>(resolve => setTimeout(resolve, 60));

const openMatch = (): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    getSocket().emit("match:create", { gameId: "yazy" }, (res) => {
      if ("error" in res) reject(new Error(res.error));
      else resolve(res.matchId);
    });
  });

const track = (store: MatchStore) => {
  const notifications: number[] = [];
  const stop = store.subscribe(() => notifications.push(1));
  return { notifications, stop };
};

describe("matchStore", () => {
  it("claims a seat on subscribe and stores the token", async () => {
    const matchId = await openMatch();
    const store = getMatchStore(matchId);
    const { stop } = track(store);

    await settle();

    expect(store.getState().seat).toBe("p0");
    expect(store.getState().error).toBeNull();
    expect(sessionStorage.getItem(`even-odds:token:${matchId}`)).toBeTruthy();
    stop();
  });

  it("reports a snapshot while the match waits for an opponent", async () => {
    const matchId = await openMatch();
    const store = getMatchStore(matchId);
    const { stop } = track(store);

    await settle();

    expect(store.getState().snapshot?.phase).toBe("waiting");
    stop();
  });

  it("keeps one identity per matchId", async () => {
    const matchId = await openMatch();
    expect(getMatchStore(matchId)).toBe(getMatchStore(matchId));
  });

  it("surfaces a rejected join as an error", async () => {
    const store = getMatchStore("does-not-exist");
    const { stop } = track(store);

    await settle();

    expect(store.getState().error).toBe("notfound");
    expect(store.getState().seat).toBeNull();
    stop();
  });

  it("stops listening once the last subscriber leaves", async () => {
    const matchId = await openMatch();
    const store = getMatchStore(matchId);
    const first = track(store);
    const second = track(store);

    await settle();
    const seen = first.notifications.length;

    first.stop();
    second.stop();
    const store2 = getMatchStore(matchId);
    store2.send({ type: "ROLL" });
    await settle();

    expect(first.notifications.length).toBe(seen);
  });
});
