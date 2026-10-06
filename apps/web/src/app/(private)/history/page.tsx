import { AirHockey } from '@even-odds/air-hockey';
import { Battleship } from '@even-odds/battleship';
import { historyFor } from '@even-odds/db';
import type { Outcome, PastMatch } from '@even-odds/db';
import { Badge } from '@even-odds/design-system/ui';
import type { BadgeTone } from '@even-odds/design-system/ui';
import { Gomoku } from '@even-odds/gomoku';
import { Pong } from '@even-odds/pong';
import { Yazy } from '@even-odds/yazy';
import { PageContainer } from '@/components/PageContainer';
import { db, requireUser } from '@/lib/session';

const GAME_NAMES: Record<string, string> = Object.fromEntries(
  [Yazy, Pong, AirHockey, Battleship, Gomoku].map((game) => [
    game.meta.id,
    game.meta.name,
  ]),
);

/* Red and blue mean seats everywhere else on the site, so an outcome never wears
   either -- a red "Lost" would read as "Red lost". */
const OUTCOMES: Record<Outcome, { label: string; tone: BadgeTone }> = {
  won: { label: 'Won', tone: 'live' },
  lost: { label: 'Lost', tone: 'neutral' },
  draw: { label: 'Draw', tone: 'waiting' },
};

const WHEN = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

// The session words a forfeit from the winner's side, which is wrong for the loser.
const howItEnded = (match: PastMatch): string | null =>
  match.reason === 'opponent disconnected' ? 'by forfeit' : match.reason;

const HistoryPage = async () => {
  const user = await requireUser();
  const past = await historyFor(db, user.id);

  return (
    <main className="flex min-h-full flex-col">
      <PageContainer>
        <h1 className="mb-6 font-eo-display text-eo-display-s tracking-eo-tight text-eo-strong">
          History
        </h1>

        {past.length === 0 ? (
          <p className="font-eo-body text-eo-body-m text-eo-muted">
            No finished matches yet.
          </p>
        ) : (
          <ol className="divide-y divide-eo-hairline overflow-hidden rounded-eo-lg border-2 border-eo-strong bg-eo-card">
            {past.map((match) => (
              <li className="flex items-center gap-4 px-5 py-4" key={match.id}>
                <Badge
                  className="w-16 justify-center"
                  tone={OUTCOMES[match.outcome].tone}
                >
                  {OUTCOMES[match.outcome].label}
                </Badge>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-eo-display text-eo-title text-eo-strong">
                    {GAME_NAMES[match.gameId] ?? match.gameId}
                    <span className="font-eo-body text-eo-body-m text-eo-muted">
                      {' '}
                      vs {match.opponent}
                    </span>
                  </p>
                  {howItEnded(match) !== null && (
                    <p className="font-eo-body text-eo-caption text-eo-muted">
                      {howItEnded(match)}
                    </p>
                  )}
                </div>

                {match.score !== null && (
                  <span className="shrink-0 font-eo-display text-eo-title text-eo-strong tabular-nums">
                    {match.score.mine}–{match.score.theirs}
                  </span>
                )}

                <time
                  className="shrink-0 font-eo-body text-eo-caption text-eo-muted tabular-nums"
                  dateTime={match.finishedAt.toISOString()}
                >
                  {WHEN.format(match.finishedAt)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </PageContainer>
    </main>
  );
};

export default HistoryPage;
