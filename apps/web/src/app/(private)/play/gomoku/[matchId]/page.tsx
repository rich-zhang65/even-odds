'use client';

import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import { Button, Card, Dialog, Toast } from '@even-odds/design-system/ui';
import type { PlayerId } from '@even-odds/game-sdk';
import type { GomokuAction, GomokuState } from '@even-odds/gomoku';
import { GomokuBoard } from '@even-odds/gomoku/ui';
import { MatchHeader } from '@/components/MatchHeader';
import { PageContainer } from '@/components/PageContainer';
import { PageHeader } from '@/components/PageHeader';
import { useMatch } from '@/lib/useMatch';

const MESSAGES: Record<string, string> = {
  full: 'This match already has two players.',
  notfound: 'That match no longer exists.',
  unauthorized: 'Your session has ended. Sign in again to keep playing.',
};

// Gomoku keeps no score, so the header counts stones on the board instead.
const stonesOf = (state: GomokuState, player: PlayerId): number =>
  state.stones.filter((stone) => stone.by === player).length;

const MatchPage = ({ params }: PageProps<'/play/gomoku/[matchId]'>) => {
  const { matchId } = use(params);
  const router = useRouter();
  const { snapshot, seat, seats, error, send } = useMatch<
    GomokuState,
    GomokuAction
  >(matchId);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const copyLink = () => {
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="flex min-h-full flex-col">
      <PageHeader />

      <PageContainer>
        {snapshot !== null && (
          <MatchHeader
            title="Gomoku"
            totals={{
              p0: stonesOf(snapshot.state, 'p0'),
              p1: stonesOf(snapshot.state, 'p1'),
            }}
            seat={seat}
            result={snapshot.result}
            onExit={() => setLeaving(true)}
          />
        )}

        {snapshot?.phase === 'paused' && (
          <Card className="mb-6 text-center font-eo-body text-eo-body-s text-eo-muted">
            Opponent disconnected — waiting for them to come back.
          </Card>
        )}

        {snapshot === null && error === null && (
          <p className="py-24 text-center font-eo-body text-eo-body-m text-eo-muted">
            Connecting…
          </p>
        )}

        {snapshot?.phase === 'waiting' && (
          <Card className="mx-auto max-w-md text-center" tone="outlined">
            <h1 className="font-eo-display text-eo-display-s tracking-eo-tight text-eo-strong">
              Waiting for an opponent
            </h1>
            <p className="mt-2 mb-6 font-eo-body text-eo-body-s text-eo-muted">
              Send this link to whoever you want to play against.
            </p>
            <Button fullWidth onClick={copyLink}>
              {copied ? 'Copied to clipboard' : 'Copy match link'}
            </Button>
            <p className="mt-4 font-eo-body text-eo-caption text-eo-muted">
              Seats · Red {seats.p0 ? 'ready' : '—'} · Blue{' '}
              {seats.p1 ? 'ready' : '—'}
            </p>
          </Card>
        )}

        {snapshot !== null && snapshot.phase !== 'waiting' && (
          <GomokuBoard snapshot={snapshot} seat={seat} onAction={send} />
        )}
      </PageContainer>

      <Dialog
        open={leaving}
        title="Leave the match?"
        description="You will drop out of the game. If you are not back within a minute, the win goes to your opponent."
        onClose={() => setLeaving(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setLeaving(false)}>
              Keep playing
            </Button>
            <Button variant="red" onClick={() => router.push('/')}>
              Leave match
            </Button>
          </>
        }
      />

      {error !== null && (
        <div className="fixed inset-x-0 bottom-8 grid place-items-center px-4">
          <Toast tone="alert" message={MESSAGES[error] ?? error} />
        </div>
      )}
    </main>
  );
};

export default MatchPage;
