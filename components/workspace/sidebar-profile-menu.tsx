"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  avatarUrl?: string;
  isAdmin: boolean;
  onSettingsClick: () => void;
  onLogoutClick: () => void;
  /** Pending "request more tokens" asks from the team (MS-248 follow-up,
   * admin-only) — in-app notification via polling, not a real push. */
  pendingTokenRequests?: number;
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
  avatarUrl,
  isAdmin,
  onSettingsClick,
  onLogoutClick,
  pendingTokenRequests = 0,
}: SidebarProfileMenuProps) {
  const showRequestBadge = isAdmin && pendingTokenRequests > 0;
  return (
    <div className="border-t border-sidebar-border p-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left outline-none transition-colors hover:bg-sidebar-accent data-[state=open]:bg-primary/10 data-[state=open]:text-primary"
          >
            <div className="relative shrink-0">
              <Avatar className="w-8 h-8">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-primary/15 text-primary font-extrabold text-xs">{initials}</AvatarFallback>
              </Avatar>
              {showRequestBadge && (
                <span
                  title={`${pendingTokenRequests} pending token request${pendingTokenRequests === 1 ? "" : "s"}`}
                  className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-sidebar"
                >
                  {pendingTokenRequests}
                </span>
              )}
            </div>
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
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="font-['Manrope'] font-bold truncate">{displayName}</span>
            <span className="text-xs font-normal text-muted-foreground truncate">
              {email ?? "Not signed in"}
            </span>
            <span className="text-xs font-['Manrope'] font-semibold text-primary">
              {isAdmin ? "Admin Access" : "Member"}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSettingsClick} className="flex items-center justify-between">
            Settings
            {showRequestBadge && (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                {pendingTokenRequests} request{pendingTokenRequests === 1 ? "" : "s"}
              </span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onLogoutClick}
            className="text-destructive focus:text-destructive"
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
