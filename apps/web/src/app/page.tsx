"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSocket, tokenKey } from "@/lib/socket";

const GAMES = [
  {
    id: "yahtzee",
    name: "Yahtzee",
    tagline: "Roll your way to victory",
    estimatedMinutes: 15,
  },
] as const;

const Home = () => {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = (gameId: string) => {
    setPending(gameId);
    setError(null);
    getSocket().emit("match:create", { gameId }, (res) => {
      if ("error" in res) {
        setPending(null);
        setError(res.error);
        return;
      }
      sessionStorage.setItem(tokenKey(res.matchId), res.token);
      router.push(`/play/${gameId}/${res.matchId}`);
    });
  };

  return (
    <main className="min-h-full flex flex-col">
      <header className="border-b border-eo-raised px-8 py-5 flex items-center justify-between">
        <div>
          <span className="font-display text-xl font-bold tracking-tight text-eo-text">
            Even Odds
          </span>
          <span className="ml-2 text-sm text-eo-muted">settle the score online</span>
        </div>
      </header>

      <div className="flex-1 px-8 py-12 max-w-5xl mx-auto w-full">
        <h1 className="font-display text-3xl font-bold text-eo-text mb-2">Choose a game</h1>
        <p className="text-eo-muted mb-10">Pick a game, share a link, play.</p>

        {error && (
          <p className="mb-6 rounded-lg border border-eo-red bg-eo-red/10 px-4 py-3 text-sm text-eo-red">
            Could not start a match ({error}). Is the server running on port 4000?
          </p>
        )}

        <div className="grid grid-cols-3 gap-4">
          {GAMES.map((game) => (
            <button
              key={game.id}
              onClick={() => start(game.id)}
              disabled={pending !== null}
              className="group text-left bg-eo-surface hover:bg-eo-raised border border-eo-raised hover:border-eo-muted rounded-xl p-6 transition-colors duration-150 disabled:opacity-60"
            >
              <div className="w-12 h-12 rounded-lg bg-eo-raised group-hover:bg-eo-ink mb-4 transition-colors duration-150" />
              <h2 className="font-display font-semibold text-eo-text mb-1">{game.name}</h2>
              <p className="text-sm text-eo-muted mb-3">{game.tagline}</p>
              <span className="text-xs text-eo-muted">
                {pending === game.id ? "Starting…" : `~${game.estimatedMinutes} min`}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
};

export default Home;
