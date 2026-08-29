import type { ReactNode } from "react";
import { cx } from "./cx";

const DIRECTIONS = {
  row: "flex-row",
  "row-reverse": "flex-row-reverse",
  column: "flex-col",
  "column-reverse": "flex-col-reverse",
};

const ALIGNS = {
  stretch: "items-stretch",
  center: "items-center",
  start: "items-start",
  end: "items-end",
  "flex-start": "items-start",
  "flex-end": "items-end",
  baseline: "items-baseline",
  "last baseline": "items-baseline-last",
};

const JUSTIFIES = {
  normal: "justify-normal",
  center: "justify-center",
  start: "justify-start",
  end: "justify-end",
  "flex-start": "justify-start",
  "flex-end": "justify-end",
  "space-between": "justify-between",
  "space-around": "justify-around",
  "space-evenly": "justify-evenly",
  stretch: "justify-stretch",
};

const WRAPS = {
  nowrap: "flex-nowrap",
  wrap: "flex-wrap",
  "wrap-reverse": "flex-wrap-reverse",
};

const SELVES = {
  auto: "self-auto",
  stretch: "self-stretch",
  center: "self-center",
  start: "self-start",
  end: "self-end",
  "flex-start": "self-start",
  "flex-end": "self-end",
  baseline: "self-baseline",
  "last baseline": "self-baseline-last",
};

export const Flex = ({
  children,
  gap,
  direction,
  align,
  justify,
  wrap,
  grow = 0,
  shrink = 1,
  basis,
  alignSelf,
  className,
  id,
}: {
  children?: ReactNode;
  gap?: string;
  direction?: keyof typeof DIRECTIONS;
  align?: keyof typeof ALIGNS;
  justify?: keyof typeof JUSTIFIES;
  wrap?: keyof typeof WRAPS;
  grow?: 0 | 1;
  shrink?: 0 | 1;
  basis?: string;
  alignSelf?: keyof typeof SELVES;
  className?: string;
  id?: string;
}) => (
  <div
    id={id}
    style={{ gap, flexBasis: basis }}
    className={cx(
      "flex",
      direction !== undefined && DIRECTIONS[direction],
      align !== undefined && ALIGNS[align],
      justify !== undefined && JUSTIFIES[justify],
      wrap !== undefined && WRAPS[wrap],
      grow === 1 ? "grow" : "grow-0",
      shrink === 1 ? "shrink" : "shrink-0",
      alignSelf !== undefined && SELVES[alignSelf],
      className,
    )}
  >
    {children}
  </div>
);
