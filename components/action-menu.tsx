import * as React from "react";

import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MENU_CHECKBOX_ITEM_CLASS,
  MENU_CONTENT_CLASS,
  MENU_DANGER_CLASS,
  MENU_ITEM_CLASS,
  MENU_LABEL_CLASS,
  MENU_POSITION,
  MENU_SEPARATOR_CLASS,
} from "@/lib/menu-styles";
import { cn } from "@/lib/utils";

// The one dropdown menu of the app ("..." on chats, files, folders, skills and members, table
// actions, the profile menu, downloads). Thin wrappers over the shadcn DropdownMenu primitives, so
// Radix still owns focus, keyboard navigation and flipping; the look lives in lib/menu-styles.
// Anything that needs a different size or side passes it through, e.g. `side="top"`, `className="w-56"`.
// Keep the trigger, the DropdownMenu root and any onSelect logic at the call site.

/** Opens under its trigger with the left edges aligned, and flips when there is no room. */
function ActionMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return <DropdownMenuContent {...MENU_POSITION} className={cn(MENU_CONTENT_CLASS, className)} {...props} />;
}

/** A row. `danger` is for Delete / Remove / Sign out: soft red text and icon, a faint wash on hover. */
function ActionMenuItem({
  danger,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuItem> & { danger?: boolean }) {
  return <DropdownMenuItem className={cn(MENU_ITEM_CLASS, danger && MENU_DANGER_CLASS, className)} {...props} />;
}

function ActionMenuCheckboxItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuCheckboxItem>) {
  return <DropdownMenuCheckboxItem className={cn(MENU_CHECKBOX_ITEM_CLASS, className)} {...props} />;
}

function ActionMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuSeparator>) {
  return <DropdownMenuSeparator className={cn(MENU_SEPARATOR_CLASS, className)} {...props} />;
}

function ActionMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuLabel>) {
  return <DropdownMenuLabel className={cn(MENU_LABEL_CLASS, className)} {...props} />;
}

export {
  ActionMenuCheckboxItem,
  ActionMenuContent,
  ActionMenuItem,
  ActionMenuLabel,
  ActionMenuSeparator,
};
