"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";

export const Dialog = ({
  open = false,
  title,
  description,
  footer,
  onClose,
  width = 460,
  children,
}: {
  open?: boolean;
  title?: string;
  description?: string;
  footer?: ReactNode;
  onClose?: () => void;
  width?: number;
  children?: ReactNode;
}) => {
  const ref = useRef<HTMLDialogElement>(null);

  // The native modal is imperative: <dialog open> alone renders inline, without
  // the top layer, focus trap or Escape handling that showModal() brings.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose?.();
      }}
      style={{ maxWidth: width }}
      className="w-full rounded-eo-xl bg-eo-card p-8 shadow-eo-lg backdrop:bg-(--eo-scrim) backdrop:backdrop-blur-[3px] open:animate-eo-pop"
    >
      <div className="mb-4 flex items-start gap-4">
        <div className="flex-1">
          {title !== undefined && (
            <h2 className="font-eo-display text-eo-display-s tracking-eo-tight text-eo-strong">
              {title}
            </h2>
          )}
          {description !== undefined && (
            <p className="mt-2 font-eo-body text-eo-body-m text-eo-muted">{description}</p>
          )}
        </div>
        {onClose !== undefined && (
          <IconButton
            icon={<Icon icon={X} />}
            label="Close"
            variant="ghost"
            size="sm"
            onClick={onClose}
          />
        )}
      </div>
      {children}
      {footer !== undefined && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
    </dialog>
  );
};
