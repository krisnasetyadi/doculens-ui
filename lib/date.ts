import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"
import relativeTime from "dayjs/plugin/relativeTime"

dayjs.extend(customParseFormat)
dayjs.extend(relativeTime)

/** What the display helpers accept: an API timestamp, epoch millis, a Date or an existing dayjs. */
type DateInput = string | number | Date | dayjs.Dayjs

// The only three absolute formats the app shows (MS-671). Local time, 24-hour, short month name,
// no seconds and no UTC offset. No screen defines its own format string; add a helper here instead.
const DATE_FORMAT = "DD MMM YYYY"
const DATE_TIME_FORMAT = "DD MMM YYYY, HH:mm"
const TIME_FORMAT = "HH:mm"

/** "06 Oct 2026" */
export function formatDate(value: DateInput): string {
  return dayjs(value).format(DATE_FORMAT)
}

/** "06 Oct 2026, 14:30" */
export function formatDateTime(value: DateInput): string {
  return dayjs(value).format(DATE_TIME_FORMAT)
}

/** "2 hours ago": for recency lists such as History and conversation search. */
export function formatRelative(value: DateInput): string {
  return dayjs(value).fromNow()
}

/** "October 2026": the heading of a month group in History and conversation search. This is a group
 * label rather than a date shown for a moment, which is why it is not one of the three absolute
 * formats above. It lives here only so no screen carries its own format string. */
export function formatMonthLabel(value: DateInput): string {
  return dayjs(value).format("MMMM YYYY")
}

const INPUT_FORMATS = [
  "DD/MM/YYYY",
  "D/M/YYYY",
  "D/M/YY",
  "YYYY-MM-DD",
  "MM/DD/YYYY",
  "D MMM YYYY",
  "D MMMM YYYY",
]

/** Parse a free-text date string using common formats. Returns a valid dayjs or null. */
export function parseInputDate(raw: string): dayjs.Dayjs | null {
  for (const format of INPUT_FORMATS) {
    const parsed = dayjs(raw, format, true)
    if (parsed.isValid()) return parsed
  }

  const loose = dayjs(raw)
  return loose.isValid() ? loose : null
}

const TIME_INPUT_FORMATS = [
  "HH:mm:ss",
  "HH:mm",
  "H:mm",
  "hh:mm:ss A",
  "hh:mm A",
  "h:mm A",
  "HHmm",
]

/** Parse a free-text time string (24h or 12h with AM/PM) using common formats. Returns a valid dayjs or null. */
export function parseInputTime(raw: string): dayjs.Dayjs | null {
  for (const format of TIME_INPUT_FORMATS) {
    const parsed = dayjs(raw, format, true)
    if (parsed.isValid()) return parsed
  }

  return null
}

/** Format a future ISO timestamp for a short "coba lagi sekitar ..." message
 * (rate-limit reset, cap renewal, etc.) — just the time if it falls today,
 * otherwise date + time, so a reset that lands tomorrow at the same clock
 * time doesn't read as if it were later today. The year stays in the other
 * case: there is no short date-and-time format without it. */
export function formatResetTime(iso: string): string {
  const target = dayjs(iso)
  return target.isSame(dayjs(), "day") ? target.format(TIME_FORMAT) : target.format(DATE_TIME_FORMAT)
}

/** Format a duration given in hours (possibly fractional, e.g. from the
 * RATE_LIMIT_WINDOW_MINUTES testing override — 2 min becomes 0.0333...)
 * for a short "(N window)" label — minutes under an hour, otherwise hours,
 * both rounded to whole numbers instead of a raw float. */
export function formatDurationHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  return `${Math.round(hours)}h`
}
