import { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TruncatedTooltip } from "@/components/truncated-tooltip";
import type { TelegramDialog, TelegramHistoryRange } from "@/services";
import { dialogMeta } from "../../_lib/telegram-chats";
import { HISTORY_RANGE_OPTIONS } from "../../_lib/telegram-history";
import { ROW_META_CLASS } from "../sources-ui";

/**
 * One chat in the picker. Memoized because an account can have thousands of chats and typing in
 * the search box must not render them all again: only the rows that appear, disappear, or are
 * (de)selected change. `onToggle` and `onRangeChange` have to stay the same function between renders.
 */
export const TelegramDialogRow = memo(function TelegramDialogRow({
  dialog,
  selected,
  range,
  onToggle,
  onRangeChange,
}: {
  dialog: TelegramDialog;
  selected: boolean;
  range: TelegramHistoryRange;
  onToggle: (dialogId: string) => void;
  onRangeChange: (dialogId: string, range: TelegramHistoryRange) => void;
}) {
  return (
    // content-visibility: a row scrolled out of view is not laid out or painted, which keeps a long list cheap.
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-accent/40 [contain-intrinsic-size:auto_52px] [content-visibility:auto]">
      <label className="flex min-w-0 flex-1 basis-40 cursor-pointer items-center gap-3">
        <Checkbox checked={selected} onCheckedChange={() => onToggle(dialog.dialog_id)} />
        <div className="min-w-0 flex-1">
          <TruncatedTooltip label={dialog.title}>
            <span className="block truncate text-xs font-medium">{dialog.title}</span>
          </TruncatedTooltip>
          <p className={ROW_META_CLASS}>{dialogMeta(dialog)}</p>
        </div>
      </label>
      {selected && (
        <Select value={range} onValueChange={(value) => onRangeChange(dialog.dialog_id, value as TelegramHistoryRange)}>
          <SelectTrigger size="sm" aria-label={`History range for ${dialog.title}`} className="w-40 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HISTORY_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
});
