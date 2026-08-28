"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameCard, Toast } from "@even-odds/design-system/ui";
import { Wordmark } from "@/components/Wordmark";
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
    <main className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-eo-hairline px-8 py-5 max-md:px-4">
        <Wordmark />
        <span className="font-eo-body text-eo-body-s text-eo-muted max-md:hidden">
          Settle the score online
        </span>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-8 py-12 max-md:px-4 max-md:py-8">
        <h1 className="font-eo-display text-eo-display-l tracking-eo-tight text-eo-strong max-md:text-eo-display-m">
          Choose a game
        </h1>
        <p className="mt-2 mb-10 font-eo-body text-eo-body-m text-eo-muted">
          Pick a game, share a link, play.
        </p>

        <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1">
          {GAMES.map((game) => (
            <GameCard
              key={game.id}
              name={game.name}
              players={pending === game.id ? "Starting…" : `~${game.estimatedMinutes} min`}
              onClick={() => start(game.id)}
            />
          ))}
        </div>
      </div>

      {error !== null && (
        <div className="fixed inset-x-0 bottom-8 grid place-items-center px-4">
          <Toast
            tone="alert"
            message={`Could not start a match (${error}). Is the server running on port 4000?`}
            onDismiss={() => setError(null)}
          />
        </div>
      )}
    </main>
  );
};

export default Home;
