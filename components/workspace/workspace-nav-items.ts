export const navItems = [
  { href: "/ask", label: "Workspace", icon: "hub" },
  { href: "/sources", label: "Sources", icon: "database" },
  { href: "/history", label: "History", icon: "history" },
];

export function isNavActive(pathname: string, href: string) {
  if (pathname === href || pathname.startsWith(href + "/")) return true;
  if (href === "/ask" && pathname === "/home") return true;
  return false;
}
