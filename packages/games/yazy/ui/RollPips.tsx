import { Flex, cx } from "@even-odds/design-system/ui";

export const RollPips = ({ used, spentText }: { used: number; spentText: string }) => (
  <Flex gap="6px" align="center">
    {[1, 2, 3].map((n) => (
      <Flex
        key={n}
        className={cx(
          "size-6 rounded-full border-2 border-eo-on-color font-eo-body text-[12px] font-extrabold tabular-nums leading-none",
          n <= used ? cx("bg-eo-on-color", spentText) : "text-eo-on-color",
        )}
        align="center"
        justify="center"
        shrink={0}
      >
        {n}
      </Flex>
    ))}
  </Flex>
);
