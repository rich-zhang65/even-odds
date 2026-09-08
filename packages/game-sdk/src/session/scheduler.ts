export type Cancel = () => void;

/* Everything a session needs from the passage of time, so that nothing inside one
   ever reaches for setInterval or Date.now directly. A test supplies its own and
   drives a whole match in a few milliseconds with no wall clock; the server
   supplies the one below and never thinks about it. */
export type Scheduler = {
  now(): number;
  every(ms: number, run: () => void): Cancel;
  after(ms: number, run: () => void): Cancel;
};

export const systemScheduler: Scheduler = {
  now: () => Date.now(),
  every: (ms, run) => {
    const handle = setInterval(run, ms);
    return () => clearInterval(handle);
  },
  after: (ms, run) => {
    const handle = setTimeout(run, ms);
    return () => clearTimeout(handle);
  },
};
