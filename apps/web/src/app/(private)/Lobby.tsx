'use client';

import { Dice5, Disc, Grid3x3, Ship, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AirHockey } from '@even-odds/air-hockey';
import { Battleship } from '@even-odds/battleship';
import { GameCard, Toast, cx } from '@even-odds/design-system/ui';
import { Gomoku } from '@even-odds/gomoku';
import { Pong } from '@even-odds/pong';
import { Yazy } from '@even-odds/yazy';
import { PageContainer } from '@/components/PageContainer';
import { getSocket } from '@/lib/socket';

type PlayableGame = {
  id: string;
  name: string;
  art: string | null;
  // Drawn when the art is missing or fails to load; the card defaults to a controller.
  icon?: LucideIcon;
};

/* Pong was the real-time engine's proving ground rather than a game anyone asked
   for, so it stays playable in development and off the shelf in production. The
   game server drops it on the same condition, so it cannot be reached directly. */
const IN_PRODUCTION = process.env.NODE_ENV === 'production';

/* Artwork comes from the game's own asset manifest, so dropping a real image in
   is one path in assets.ts and no edit here. */
const PLAYABLE: PlayableGame[] = [
  {
    id: Yazy.meta.id,
    name: Yazy.meta.name,
    art: Yazy.meta.assets.icon,
    icon: Dice5,
  },
  ...(IN_PRODUCTION
    ? []
    : [{ id: Pong.meta.id, name: Pong.meta.name, art: Pong.meta.assets.icon }]),
  {
    id: AirHockey.meta.id,
    name: AirHockey.meta.name,
    art: AirHockey.meta.assets.icon,
    icon: Disc,
  },
  {
    id: Battleship.meta.id,
    name: Battleship.meta.name,
    art: Battleship.meta.assets.icon,
    icon: Ship,
  },
  {
    id: Gomoku.meta.id,
    name: Gomoku.meta.name,
    art: Gomoku.meta.assets.icon,
    icon: Grid3x3,
  },
];

// The full shelf reads alphabetically; what was played lately has its own row.
const ALPHABETICAL = [...PLAYABLE].sort((one, other) =>
  one.name.localeCompare(other.name),
);

/* Fixed tracks, so a card is the same square at every viewport and object-cover
   never re-crops the art. 208px tiles exactly five across the page: the 1200px
   max includes PageContainer's 40px gutters, leaving 1120px, and 5 x 208 plus
   four 20px gaps is 1120. It was 214px, sized against the full 1200 as if the
   gutters were not there, which needed 1150px and always wrapped the fifth card.
   Any fixed width leaves a remainder at other widths -- that is the cost of not
   using 1fr, and it only shows once a row fills. */
const ROW = 'grid grid-cols-[repeat(auto-fill,208px)] gap-x-5';
const HEADING =
  'font-eo-display text-eo-display-s tracking-eo-tight text-eo-strong';

const PlayCard = ({
  game,
  disabled,
  onStart,
}: {
  game: PlayableGame;
  disabled: boolean;
  onStart: (gameId: string) => void;
}) => (
  <GameCard
    name={game.name}
    art={game.art ?? undefined}
    icon={game.icon}
    disabled={disabled}
    onClick={() => onStart(game.id)}
  />
);

/* The page's interactive half: starting a match needs the socket, so it runs in
   the browser. The page itself reads history on the server and hands over the
   games played most recently, by id, newest first. */
export const Lobby = ({ recent }: { recent: string[] }) => {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /* Starting a match while the game server is still asleep: the request waits
     until it wakes, which can be a minute, so say so rather than sit silent. */
  const [waking, setWaking] = useState(false);

  const start = (gameId: string) => {
    setPending(gameId);
    setError(null);
    const socket = getSocket();
    setWaking(!socket.connected);
    socket.emit('match:create', { gameId }, (res) => {
      setWaking(false);
      if ('error' in res) {
        setPending(null);
        setError(res.error);
        return;
      }
      router.push(`/play/${gameId}/${res.matchId}`);
    });
  };

  /* Only games still on the shelf: Pong can be in someone's history from
     development and still be off the shelf in production. */
  const played = recent.flatMap((id) =>
    PLAYABLE.filter((game) => game.id === id),
  );

  return (
    <main className="flex min-h-full flex-col">
      <PageContainer>
        <h1 className="sr-only">Even Odds</h1>

        {/* One row however wide the page: the first row is declared, and every
            row after it collapses to nothing and is clipped, so a narrower screen shows as many of the
            most recent as fit. Hidden until there is something to show. */}
        {played.length > 0 && (
          <section className="mb-14 max-md:mb-8">
            <h2 className={cx(HEADING, 'mb-5')}>Recently played</h2>
            <div
              className={cx(
                ROW,
                'grid-rows-[auto] auto-rows-[0] overflow-hidden',
              )}
            >
              {played.map((game) => (
                <PlayCard
                  key={game.id}
                  game={game}
                  disabled={pending !== null}
                  onStart={start}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className={cx(HEADING, 'mb-5')}>All games</h2>
          <div className={cx(ROW, 'gap-y-5')}>
            {ALPHABETICAL.map((game) => (
              <PlayCard
                key={game.id}
                game={game}
                disabled={pending !== null}
                onStart={start}
              />
            ))}
          </div>
        </section>
      </PageContainer>

      {waking && (
        <div className="fixed inset-x-0 bottom-8 grid place-items-center px-4">
          <Toast
            tone="neutral"
            message="Waking up the game server. This can take up to a minute."
          />
        </div>
      )}

      {error !== null && (
        <div className="fixed inset-x-0 bottom-8 grid place-items-center px-4">
          <Toast
            tone="alert"
            message={`Could not start a match (${error}).`}
            onDismiss={() => setError(null)}
          />
        </div>
      )}
    </main>
  );
};
