import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** First letter of up to the first two words, e.g. "Jane Doe" -> "JD". */
export function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay: number,
) {
  let timeoutId: ReturnType<typeof setTimeout>

  return (...args: TArgs) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/** Only redirect back to a same-site path after login/register — never let
 * ?next send users off-app. Shared by both auth pages so they agree on
 * exactly one validation rule. */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/home"
  return next
}
