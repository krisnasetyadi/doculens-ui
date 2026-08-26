export const navItems = [
  { href: "/ask", label: "Workspace", icon: "hub" },
  { href: "/sources", label: "Sources", icon: "database" },
];

export function isNavActive(pathname: string, href: string) {
  if (pathname === href || pathname.startsWith(href + "/")) return true;
  if (href === "/ask" && pathname === "/home") return true;
  return false;
}
