"use client";

import { RouteError } from "@/components/route-error";

// Rendered inside WorkspaceLayout's <main>, so the sidebar, header and bottom
// tab bar stay on screen when a workspace screen throws while rendering.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError error={error} reset={reset} scope="workspace" />;
}
