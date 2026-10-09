"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * A button that takes the user to another page. The next page can take a moment to arrive, so the
 * click answers at once: the button shows the loading state ("Opening…" unless `loadingText` says
 * otherwise) and is disabled until the new page renders, which also stops a second click. The
 * transition stays pending for exactly as long as the navigation does.
 */
export function NavButton({
  href,
  loadingText = "Opening…",
  onClick,
  ...props
}: Omit<ButtonProps, "asChild"> & { href: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      loading={pending}
      loadingText={loadingText}
      onClick={(event) => {
        onClick?.(event);
        if (pending || event.defaultPrevented) return;
        startTransition(() => router.push(href));
      }}
      {...props}
    />
  );
}
