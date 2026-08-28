import { cx } from "./cx";

export const VersusBanner = ({
  redName = "Red",
  blueName = "Blue",
  label,
  className,
}: {
  redName?: string;
  blueName?: string;
  label?: string;
  className?: string;
}) => (
  <div className={cx("relative grid h-33 grid-cols-2 overflow-hidden rounded-eo-lg", className)}>
    <div className="flex items-center justify-start bg-eo-red-400 px-8">
      <span className="font-eo-display text-eo-display-s tracking-eo-tight text-eo-on-color">
        {redName}
      </span>
    </div>
    <div className="flex items-center justify-end bg-eo-blue-500 px-8">
      <span className="font-eo-display text-eo-display-s tracking-eo-tight text-eo-on-color">
        {blueName}
      </span>
    </div>
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <span className="grid size-16 place-items-center rounded-full border-[3px] border-eo-ink-900 bg-eo-paper font-eo-display text-[22px] font-bold text-eo-strong shadow-eo-md">
        VS
      </span>
    </div>
    {label !== undefined && (
      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 font-eo-body text-eo-caption tracking-eo-caps text-eo-on-color/85 uppercase">
        {label}
      </span>
    )}
  </div>
);
