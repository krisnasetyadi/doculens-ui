import type { ReactNode } from "react";
import { Pencil, Pin, Settings, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

// Icons for the shared "..." menus (see lib/menu-styles). They are Lucide, the
// icon set shadcn/ui ships with, drawn at one size and stroke so every menu
// matches. They sit in a span so shadcn's `*:[svg]` colour rules on a menu item
// (which would turn a Delete icon the theme's destructive red) don't reach them.

/** The 15px slot an icon sits in; colour follows the item for `danger`, else black. */
export function MenuIcon({ danger, children }: { danger?: boolean; children: ReactNode }) {
  return <span className={cn("block size-[15px] shrink-0", !danger && "text-[#0A0A0A] dark:text-foreground")}>{children}</span>;
}

/** Size and stroke shared by every menu icon, including any lucide icon used directly in a menu. */
export const MENU_LUCIDE = { strokeWidth: 1.7, className: "size-[15px] text-current" } as const;

export function RenameGlyph() {
  return <Pencil aria-hidden="true" {...MENU_LUCIDE} />;
}

export function PinGlyph() {
  return <Pin aria-hidden="true" {...MENU_LUCIDE} />;
}

export function SettingsGlyph() {
  return <Settings aria-hidden="true" {...MENU_LUCIDE} />;
}

export function DeleteGlyph() {
  return <Trash2 aria-hidden="true" {...MENU_LUCIDE} />;
}

/** Three filled dots: the "..." in the trigger button. */
export function DotsGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="block size-3.5 fill-current">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}
