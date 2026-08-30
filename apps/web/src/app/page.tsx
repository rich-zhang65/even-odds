"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameCard, Toast, cx } from "@even-odds/design-system/ui";
import { Yahtzee } from "@even-odds/yahtzee";
import { PageHeader } from "@/components/PageHeader";
import { getSocket, tokenKey } from "@/lib/socket";

type PlayableGame = {
  id: string;
  name: string;
  art: string | null;
};

/* Artwork comes from the game's own asset manifest, so dropping a real image in
   is one path in assets.ts and no edit here. */
const PLAYABLE: PlayableGame[] = [
  {
    id: Yahtzee.meta.id,
    name: Yahtzee.meta.name,
    art: Yahtzee.meta.assets.icon,
  },
];

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-5";
const HEADING = "font-eo-display text-eo-display-s tracking-eo-tight text-eo-strong";

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

  const playable = PLAYABLE.map((game) => (
    <GameCard
      key={game.id}
      name={game.name}
      art={game.art ?? undefined}
      disabled={pending !== null}
      onClick={() => start(game.id)}
    />
  ));

  return (
    <main className="flex min-h-full flex-col">
      <PageHeader />

      <div className="mx-auto w-full max-w-(--eo-page-max) flex-1 px-6 py-10 max-md:px-4 max-md:py-6">
        <h1 className="sr-only">Even Odds</h1>

        <section className="mb-14 max-md:mb-8">
          <h2 className={cx(HEADING, "mb-5")}>Recently played</h2>
          <div className={GRID}>{playable}</div>
        </section>

        <section>
          <h2 className={cx(HEADING, "mb-5")}>All games</h2>
          <div className={GRID}>{playable}</div>
        </section>
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
