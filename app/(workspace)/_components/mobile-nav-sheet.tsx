"use client";

import { useEffect, useRef, type RefObject } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { WorkspaceNavContent } from "@/components/workspace/workspace-sidebar";
import { IconButton } from "@/components/icon-button";

interface MobileNavSheetProps {
  /** The header button that opens this sheet. It is not a SheetTrigger, so
   * Radix cannot return focus to it on its own. */
  triggerRef: RefObject<HTMLElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsClick: () => void;
  onLogoutClick: () => void;
  onSearchClick: () => void;
  pendingTokenRequests?: number;
}

/** The sidebar's content as a left sheet, for screens below lg where the
 * sidebar itself is hidden. Opened from the header's menu button. */
export function MobileNavSheet({
  triggerRef,
  open,
  onOpenChange,
  onSettingsClick,
  onLogoutClick,
  onSearchClick,
  pendingTokenRequests,
}: MobileNavSheetProps) {
  const pathname = usePathname();
  const afterCloseRef = useRef<(() => void) | null>(null);

  // Opening a conversation only changes the query string, so the explicit
  // onNavigate below is what closes the sheet for those. This covers every
  // other route change.
  useEffect(() => {
    onOpenChange(false);
  }, [pathname, onOpenChange]);

  // Rotating a tablet past lg swaps in the real sidebar; the sheet must not
  // stay open on top of it.
  useEffect(() => {
    if (!open) return;
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) onOpenChange(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [open, onOpenChange]);

  // Settings, search and sign-out each open another Radix modal. Opening one
  // while this sheet is still animating out makes the two layers fight over
  // the shared body pointer-events lock and leaves the page unclickable
  // (MS-255). The sheet's close-autofocus callback only fires once its layer
  // has fully unmounted, so the action waits for that instead of a timer.
  const afterClose = (action: () => void) => () => {
    afterCloseRef.current = action;
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={false}
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const action = afterCloseRef.current;
          if (!action) {
            triggerRef.current?.focus();
            return;
          }
          afterCloseRef.current = null;
          // The next dialog takes focus; handing it back to the menu button
          // first would pull it out again.
          action();
        }}
        className="w-[min(320px,85vw)] gap-0 border-sidebar-border bg-sidebar p-0 sm:max-w-[320px]"
      >
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        {/* The stock close button is 16px; this one is a 40px target centred on
            the logo row (row centre is 43px from the top). */}
        <SheetClose asChild>
          <IconButton
            label="Close navigation menu"
            className="absolute right-3 top-[23px] z-10"
          >
            <X className="size-5" />
          </IconButton>
        </SheetClose>
        <nav
          aria-label="Workspace"
          className="pointer-events-auto flex min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]"
        >
          <WorkspaceNavContent
            variant="sheet"
            onNavigate={() => onOpenChange(false)}
            onSettingsClick={afterClose(onSettingsClick)}
            onLogoutClick={afterClose(onLogoutClick)}
            onSearchClick={afterClose(onSearchClick)}
            pendingTokenRequests={pendingTokenRequests}
          />
        </nav>
      </SheetContent>
    </Sheet>
  );
}
