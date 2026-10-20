import { useSyncExternalStore } from "react";

export type FoldersViewMode = "grid" | "list";

type FoldersPrefs = { open: boolean; view: FoldersViewMode };

const OPEN_KEY = "sources.foldersOpen";
const VIEW_KEY = "sources.foldersView";
const DEFAULTS: FoldersPrefs = { open: true, view: "grid" };

const listeners = new Set<() => void>();
let current: FoldersPrefs | null = null;

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Storage can be blocked (private window): the defaults apply.
    return null;
  }
}

function snapshot(): FoldersPrefs {
  current ??= {
    open: readStored(OPEN_KEY) !== "closed",
    view: readStored(VIEW_KEY) === "list" ? "list" : "grid",
  };
  return current;
}

function update(patch: Partial<FoldersPrefs>) {
  current = { ...snapshot(), ...patch };
  try {
    localStorage.setItem(OPEN_KEY, current.open ? "open" : "closed");
    localStorage.setItem(VIEW_KEY, current.view);
  } catch {
    // Not remembered across reloads, but the choice still holds while the page is open.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

/**
 * Whether the Folders section is open and whether it shows cards or rows. One shared value, so the
 * choice survives a tab switch or a trip into another folder, and the loading placeholder matches
 * what is about to appear. The server render and the first client render use the defaults, so
 * hydration never disagrees with the saved choice.
 */
export function useFoldersView() {
  const prefs = useSyncExternalStore(subscribe, snapshot, () => DEFAULTS);
  return {
    open: prefs.open,
    view: prefs.view,
    setOpen: (open: boolean) => update({ open }),
    setView: (view: FoldersViewMode) => update({ view }),
  };
}
