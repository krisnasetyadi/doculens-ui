import { useCallback, useRef } from "react";

const HIDE_AFTER_MS = 1000;

/**
 * Ref callback: while anything inside the element scrolls, it carries
 * `data-scrolling`; one second after the last scroll the attribute is removed.
 * Pair it with the `.auto-hide-scrollbar` class in globals.css.
 */
export function useAutoHideScrollbar<T extends HTMLElement>() {
  const cleanup = useRef<(() => void) | null>(null);

  return useCallback((node: T | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!node) return;

    let timer: number | undefined;
    const onScroll = () => {
      node.setAttribute("data-scrolling", "");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => node.removeAttribute("data-scrolling"), HIDE_AFTER_MS);
    };
    // Scroll events do not bubble, so listen in the capture phase to catch every inner scroller.
    node.addEventListener("scroll", onScroll, { capture: true, passive: true });
    cleanup.current = () => {
      node.removeEventListener("scroll", onScroll, true);
      window.clearTimeout(timer);
    };
  }, []);
}
