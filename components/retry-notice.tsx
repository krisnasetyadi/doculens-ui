import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Notice } from "@/components/notice";

/**
 * The message for something that failed to load, with a Retry action. Used wherever a failed request
 * would otherwise read as "nothing here" (an empty list, a missing section): the error and the empty
 * state must never look the same. `retrying` is true while the retry is in flight.
 */
export function RetryNotice({
  children,
  onRetry,
  retrying = false,
  size,
  className,
}: {
  children: ReactNode;
  onRetry: () => void;
  retrying?: boolean;
  size?: "default" | "sm";
  className?: string;
}) {
  return (
    <Notice tone="error" size={size} role="alert" className={className}>
      {children}{" "}
      <Button type="button" variant="link" size="xs" loading={retrying} loadingText="Retrying…" onClick={onRetry}>
        Retry
      </Button>
    </Notice>
  );
}
