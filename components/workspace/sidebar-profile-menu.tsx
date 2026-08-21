"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarProfileMenuProps {
  displayName: string;
  initials: string;
  email?: string;
  isAdmin: boolean;
  onLogoutClick: () => void;
}

/** Sidebar footer's account menu — one menu for all account-related actions
 * (MS-86), mirroring the header's account dropdown but positioned for the
 * sidebar footer (opens upward, closer to the trigger). Split into its own
 * file so future edits to the sidebar's other sections (nav, session list)
 * don't collide with this one on the same lines. */
export function SidebarProfileMenu({
  displayName,
  initials,
  email,
  isAdmin,
  onLogoutClick,
}: SidebarProfileMenuProps) {
  return (
    <div className="border-t border-sidebar-border p-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left outline-none transition-colors hover:bg-sidebar-accent data-[state=open]:bg-primary/10 data-[state=open]:text-primary"
          >
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="bg-primary/15 text-primary font-extrabold text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-sidebar-foreground truncate">{displayName}</span>
              <span className="text-[10px] text-primary">
                {isAdmin ? "Admin Access" : "Member"}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={8}
          className="w-56 rounded-xl shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)]"
        >
          <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
            {email ?? "Not signed in"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onLogoutClick}
            className="text-destructive focus:text-destructive"
          >
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
