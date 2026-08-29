"use client";

import type { ReactNode } from "react";

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
  if (!open) return null;

  return (
    <dialog
      // showModal() is the only way to get the top layer, ::backdrop, focus trap
      // and Escape; the open attribute alone renders inline and non-modal.
      // Calling it from the ref, on a dialog that exists only while open, is
      // what lets this component hold no state and run no effect.
      //
      // No cleanup on purpose. close() fires the close event, which is routed
      // straight back to onClose -- so a detach told the caller to close, and
      // StrictMode's simulated remount did that the instant it opened. Removing
      // the node from the DOM already takes it out of the top layer. The open
      // guard is for the reattach that follows that same simulated detach.
      ref={(node) => {
        if (node !== null && !node.open) node.showModal();
      }}
      onClose={onClose}
      style={{ maxWidth: width }}
      className="m-auto w-full rounded-eo-xl bg-eo-card p-8 shadow-eo-lg backdrop:bg-(--eo-scrim) backdrop:backdrop-blur-[3px] open:animate-eo-pop"
    >
      <div className="mb-4">
        {title !== undefined && (
          <h2 className="font-eo-display text-eo-display-s tracking-eo-tight text-eo-strong">
            {title}
          </h2>
        )}
        {description !== undefined && (
          <p className="mt-2 font-eo-body text-eo-body-m text-eo-muted">{description}</p>
        )}
      </div>
      {children}
      {footer !== undefined && <div className="mt-6 flex justify-end gap-3">{footer}</div>}
    </dialog>
  );
};
