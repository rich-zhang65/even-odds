export const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter((part) => typeof part === "string" && part.length > 0).join(" ");
