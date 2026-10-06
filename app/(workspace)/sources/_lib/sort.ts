import type { SortKey, SortState } from "../_types/sources.type";

/** Clicking the active column flips its direction; any other column starts ascending. */
export function toggleSort(
  current: SortState,
  key: SortKey,
  setter: (next: SortState) => void,
) {
  setter(
    current.key === key
      ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
      : { key, dir: "asc" },
  );
}
