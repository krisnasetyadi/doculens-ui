"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { House, RotateCw, TriangleAlert } from "lucide-react";
import { BrandShell } from "@/components/brand-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { SECONDARY_BUTTON_CLASS } from "@/lib/button-styles";

/** What an error.tsx boundary renders. The raw error never reaches the screen:
 * it goes to the console (and the digest ties it to the server log), while the
 * user only gets a short explanation and a way forward. */
export function RouteError({
  error,
  reset,
  scope,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** "workspace" renders inside the workspace shell, so the sidebar, header and
   * tab bar stay usable; "public" is a standalone page for everything else. */
  scope: "workspace" | "public";
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  // reset() alone only re-renders the client tree. refresh() first, so a screen
  // that crashed on server data fetches it again, and both stay on this URL.
  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  const inWorkspace = scope === "workspace";

  const state = (
    <EmptyState
      icon={<TriangleAlert />}
      heading="Something went wrong"
      label={
        inWorkspace
          ? "This screen ran into a problem and could not be shown. Try again, or head back to Home."
          : "This page ran into a problem and could not be shown. Try again, or head back to the start."
      }
      onUpload={retry}
      uploadLabel="Try again"
      uploadIcon={<RotateCw className="size-3.5" />}
      ctaVariant="primary"
      secondaryAction={
        <Button asChild variant="outline" className={`${SECONDARY_BUTTON_CLASS} flex-none`}>
          <Link href={inWorkspace ? "/home" : "/"}>
            <House className="size-3.5" />
            {inWorkspace ? "Go to Home" : "Back to landing page"}
          </Link>
        </Button>
      }
    />
  );

  if (inWorkspace) {
    return <div className="flex h-full items-center justify-center overflow-y-auto">{state}</div>;
  }
  return <BrandShell maxWidth="max-w-lg">{state}</BrandShell>;
}
