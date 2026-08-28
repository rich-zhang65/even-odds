"use client";

import Link from "next/link";
import { use, useState } from "react";
import type { PlayerId } from "@even-odds/game-sdk";
import { YahtzeeBoard } from "@even-odds/yahtzee/ui";
import { useMatch } from "@/lib/useMatch";

const SEAT_NAME: Record<PlayerId, string> = { p0: "Red", p1: "Blue" };
const SEAT_TEXT: Record<PlayerId, string> = { p0: "text-eo-red", p1: "text-eo-blue" };

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
  const outcome =
    result === null
      ? null
      : "draw" in result
        ? "Dead even"
        : `${SEAT_NAME[result.winner]} wins${result.reason ? ` — ${result.reason}` : ""}`;

  return (
    <main className="min-h-full flex flex-col">
      <header className="flex items-center justify-between border-b border-eo-raised px-8 py-5 max-md:flex-col max-md:items-start max-md:gap-3 max-md:px-4">
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-eo-text">
          Even Odds
        </Link>

        <div className="flex items-center gap-4">
          {seat && (
            <span className="text-sm text-eo-muted">
              You are <span className={`font-semibold ${SEAT_TEXT[seat]}`}>{SEAT_NAME[seat]}</span>
            </span>
          )}
          <button
            type="button"
            onClick={copyLink}
            className="rounded-lg border border-eo-raised bg-eo-surface px-4 py-2 text-sm text-eo-text transition-colors duration-150 hover:border-eo-muted"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-8 py-8 max-md:px-4 max-md:py-5">
        {error !== null && (
          <p className="mb-6 rounded-lg border border-eo-red bg-eo-red/10 px-4 py-3 text-sm text-eo-red">
            {MESSAGES[error] ?? error}
          </p>
        )}

        {outcome !== null && (
          <p className="mb-6 rounded-lg border border-eo-gold bg-eo-gold/10 px-4 py-3 text-center font-display font-bold text-eo-gold">
            {outcome}
          </p>
        )}

        {snapshot?.phase === "paused" && (
          <p className="mb-6 rounded-lg border border-eo-raised bg-eo-surface px-4 py-3 text-center text-sm text-eo-muted">
            Opponent disconnected — waiting for them to come back.
          </p>
        )}

        {snapshot === null && error === null && (
          <p className="py-24 text-center text-eo-muted">Connecting…</p>
        )}

        {snapshot?.phase === "waiting" && (
          <section className="mx-auto max-w-md rounded-xl border border-eo-raised bg-eo-surface p-8 text-center">
            <h1 className="mb-2 font-display text-2xl font-bold text-eo-text">
              Waiting for an opponent
            </h1>
            <p className="mb-6 text-sm text-eo-muted">
              Send this link to whoever you want to play against.
            </p>
            <button
              type="button"
              onClick={copyLink}
              className="w-full rounded-lg bg-eo-red px-6 py-3 font-display font-bold text-eo-text transition-colors duration-150 hover:brightness-110"
            >
              {copied ? "Copied to clipboard" : "Copy match link"}
            </button>
            <p className="mt-4 text-xs text-eo-muted">
              Seats · Red {seats.p0 ? "ready" : "—"} · Blue {seats.p1 ? "ready" : "—"}
            </p>
          </section>
        )}

        {snapshot !== null && snapshot.phase !== "waiting" && (
          <YahtzeeBoard snapshot={snapshot} seat={seat} onAction={send} />
        )}
      </div>
    </main>
  );
};

export default MatchPage;
