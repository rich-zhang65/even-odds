import { cx } from '@even-odds/design-system/ui';

/* The lemon-lime: one citrus, tilted on the diagonal and split across its
   length by a lightning bolt, lemon on one side and lime on the other: a full
   oval with a small nub at each end, as a citrus has. Drawn around the centre
   of a 24-unit box lying along the x axis and then turned, and the view is
   trimmed to the fruit so it sits in the name like the dot it replaces;
   the fills and outline are the theme's own colours, so it follows the theme. */
export const CitrusMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="2.5 2.5 19 19" aria-hidden="true">
    <defs>
      <clipPath id="citrus-skin">
        <path d="M -10.8 0 C -10.2 -0.8 -9.5 -1.5 -8.7 -2.4 C -7.5 -5.7 -4.3 -7.4 0 -7.4 C 4.3 -7.4 7.5 -5.7 8.7 -2.4 C 9.5 -1.5 10.2 -0.8 10.8 0 C 10.2 0.8 9.5 1.5 8.7 2.4 C 7.5 5.7 4.3 7.4 0 7.4 C -4.3 7.4 -7.5 5.7 -8.7 2.4 C -9.5 1.5 -10.2 0.8 -10.8 0 Z" />
      </clipPath>
    </defs>
    <g transform="translate(12 12) rotate(-45)">
      <g clipPath="url(#citrus-skin)">
        {/* Each half runs to the bolt's zigzag, so the two meet along it. */}
        <path
          d="M -12 -9 L 12 -9 L 12 3.1 L 0.4 -0.9 L -0.6 1.4 L -12 -3.4 Z"
          fill="var(--color-eo-red-solid)"
        />
        <path
          d="M -12 9 L 12 9 L 12 3.1 L 0.4 -0.9 L -0.6 1.4 L -12 -3.4 Z"
          fill="var(--color-eo-blue-solid)"
        />
        <path
          d="M 9.6 2.3 L 0.4 -0.9 L -0.6 1.4 L -9.6 -2.4"
          fill="none"
          stroke="var(--color-eo-strong)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M -10.8 0 C -10.2 -0.8 -9.5 -1.5 -8.7 -2.4 C -7.5 -5.7 -4.3 -7.4 0 -7.4 C 4.3 -7.4 7.5 -5.7 8.7 -2.4 C 9.5 -1.5 10.2 -0.8 10.8 0 C 10.2 0.8 9.5 1.5 8.7 2.4 C 7.5 5.7 4.3 7.4 0 7.4 C -4.3 7.4 -7.5 5.7 -8.7 2.4 C -9.5 1.5 -10.2 0.8 -10.8 0 Z"
        fill="none"
        stroke="var(--color-eo-strong)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

/* The name, with the lemon-lime where the dot would be. The dot itself is kept
   for screen readers, which would otherwise read "lemonlime". */
export const Wordmark = ({ className }: { className?: string }) => (
  <span
    className={cx(
      'font-eo-display text-eo-title font-bold tracking-eo-tight lowercase text-eo-strong',
      className,
    )}
  >
    lemon
    <CitrusMark className="mx-[0.03em] inline-block size-[0.82em] align-[-0.1em]" />
    <span className="sr-only">.</span>
    lime
  </span>
);
