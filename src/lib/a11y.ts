import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Keyboard behaviour shared by every overlay on the site: Escape closes it,
 * Tab is trapped inside it, focus moves in when it opens and returns to the
 * trigger when it closes.
 */
export function useDialogBehaviour(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreRef.current = (document.activeElement as HTMLElement | null) ?? null;

    const container = containerRef.current;
    if (container) {
      const first = container.querySelector<HTMLElement>(FOCUSABLE);
      const target = first ?? container;
      window.setTimeout(() => target.focus(), 30);
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const node = containerRef.current;
      if (!node) return;
      const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (!focusable.length) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === node)) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restoreRef.current?.focus?.();
    };
  }, [open, containerRef, onClose]);
}

/** Remember and restore the page scroll position while a modal is open. */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}
