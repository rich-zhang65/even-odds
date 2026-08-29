"use client";

import Link from "next/link";
import { use, useState } from "react";
import type { PlayerId } from "@even-odds/game-sdk";
import { Button, Card, Flex, PlayerChip, Toast } from "@even-odds/design-system/ui";
import { YahtzeeBoard } from "@even-odds/yahtzee/ui";
import { Wordmark } from "@/components/Wordmark";
import { useMatch } from "@/lib/useMatch";

const SEAT_NAME: Record<PlayerId, string> = { p0: "Red", p1: "Blue" };
const SEAT_SIDE: Record<PlayerId, "red" | "blue"> = { p0: "red", p1: "blue" };
const SEAT_TEXT: Record<PlayerId, string> = { p0: "text-eo-red-600", p1: "text-eo-blue-600" };

const MESSAGES: Record<string, string> = {
  full: "This match already has two players.",
  notfound: "That match no longer exists.",
};

const MatchPage = ({ params }: PageProps<"/play/yahtzee/[matchId]">) => {
  const { matchId } = use(params);
  const { snapshot, seat, seats, error, send } = useMatch(matchId);
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const result = snapshot?.result ?? null;

  return (
    <main className="flex min-h-full flex-col">
      <Flex
        align="center"
        justify="space-between"
        className="border-b border-eo-hairline px-8 py-5 max-md:flex-col max-md:items-start max-md:gap-3 max-md:px-4"
      >
        <Link href="/">
          <Wordmark />
        </Link>

        <Flex align="center" gap="16px">
          {seat !== null && (
            <PlayerChip name={SEAT_NAME[seat]} side={SEAT_SIDE[seat]} record="you" size="sm" />
          )}
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? "Copied" : "Copy link"}
          </Button>
        </Flex>
      </Flex>

      <div className="mx-auto w-full max-w-6xl flex-1 px-8 py-8 max-md:px-4 max-md:py-5">
        {result !== null && (
          <Card tone="outlined" className="mb-6 text-center">
            <p className="font-eo-display text-eo-display-s tracking-eo-tight text-eo-strong">
              {"draw" in result ? (
                "Dead even"
              ) : (
                <>
                  <span className={SEAT_TEXT[result.winner]}>{SEAT_NAME[result.winner]}</span> wins
                </>
              )}
            </p>
            {!("draw" in result) && result.reason !== undefined && (
              <p className="mt-1 font-eo-body text-eo-body-s text-eo-muted">{result.reason}</p>
            )}
          </Card>
        )}

        {snapshot?.phase === "paused" && (
          <Card className="mb-6 text-center font-eo-body text-eo-body-s text-eo-muted">
            Opponent disconnected — waiting for them to come back.
          </Card>
        )}

        {snapshot === null && error === null && (
          <p className="py-24 text-center font-eo-body text-eo-body-m text-eo-muted">Connecting…</p>
        )}

        {snapshot?.phase === "waiting" && (
          <Card tone="outlined" className="mx-auto max-w-md text-center">
            <h1 className="font-eo-display text-eo-display-s tracking-eo-tight text-eo-strong">
              Waiting for an opponent
            </h1>
            <p className="mt-2 mb-6 font-eo-body text-eo-body-s text-eo-muted">
              Send this link to whoever you want to play against.
            </p>
            <Button fullWidth onClick={copyLink}>
              {copied ? "Copied to clipboard" : "Copy match link"}
            </Button>
            <p className="mt-4 font-eo-body text-eo-caption text-eo-muted">
              Seats · Red {seats.p0 ? "ready" : "—"} · Blue {seats.p1 ? "ready" : "—"}
            </p>
          </Card>
        )}

        {snapshot !== null && snapshot.phase !== "waiting" && (
          <YahtzeeBoard snapshot={snapshot} seat={seat} onAction={send} />
        )}
      </div>

      {error !== null && (
        <div className="fixed inset-x-0 bottom-8 grid place-items-center px-4">
          <Toast tone="alert" message={MESSAGES[error] ?? error} />
        </div>
      )}
    </main>
  );
};

export default MatchPage;
