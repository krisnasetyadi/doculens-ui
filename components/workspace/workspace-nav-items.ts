export const navItems = [
  { href: "/ask", label: "Workspace", icon: "hub" },
  { href: "/sources", label: "Sources", icon: "database" },
];

/** MS-388: every pathname the shared chat view renders from — /ask
 * (dedicated) and /home (hero, then chat inline once a message is sent).
 * A conversation started from /home never changes the URL, so /ask alone
 * doesn't identify "a chat is on screen". */
export function isChatPathname(pathname: string) {
  return pathname === "/ask" || pathname === "/home";
}

/** MS-388: `hasActiveSession` is what moves the highlight off "Workspace"
 * and onto the conversation itself once one exists. The chat view renders
 * from the same pathname either way, so pathname alone can't tell
 * "browsing the workspace" from "sitting in a specific chat". */
export function isNavActive(pathname: string, href: string, hasActiveSession = false) {
  // Checked before the generic pathname match on purpose: with a session
  // active, "Workspace" has to go dark even though the pathname still
  // matches it.
  if (href === "/ask" && isChatPathname(pathname)) return !hasActiveSession;
  if (pathname === href || pathname.startsWith(href + "/")) return true;
  return false;
}
