import type { TelegramHistoryRange } from "@/services";

/** The choices for how far back a Telegram chat is kept, in the order the Select lists them (MS-912). */
export const HISTORY_RANGE_OPTIONS: { value: TelegramHistoryRange; label: string }[] = [
  { value: "1m", label: "Last month" },
  { value: "3m", label: "Last 3 months" },
  { value: "1y", label: "Last year" },
  { value: "all", label: "All messages" },
];

/** What a newly picked chat starts with. Chats synced before ranges existed already read "all". */
export const DEFAULT_HISTORY_RANGE: TelegramHistoryRange = "3m";

const LABELS = Object.fromEntries(HISTORY_RANGE_OPTIONS.map((option) => [option.value, option.label]));

export function historyRangeLabel(range: TelegramHistoryRange): string {
  return LABELS[range] ?? LABELS.all;
}
