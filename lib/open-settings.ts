/** Open the Settings dialog on a given tab from anywhere in the workspace
 * (e.g. the Files-tab storage meter). The dialog is owned by the workspace
 * layout, so this is an event rather than a prop passed through every level. */
export const OPEN_SETTINGS_EVENT = "doculens:open-settings";

export function openSettings(category: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT, { detail: { category } }));
}
