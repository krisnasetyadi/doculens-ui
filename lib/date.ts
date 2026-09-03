import dayjs from "dayjs"
import customParseFormat from "dayjs/plugin/customParseFormat"

dayjs.extend(customParseFormat)

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
 * time doesn't read as if it were later today. */
export function formatResetTime(iso: string): string {
  const target = dayjs(iso)
  return target.isSame(dayjs(), "day") ? target.format("HH:mm") : target.format("DD MMM, HH:mm")
}

/** Format a duration given in hours (possibly fractional, e.g. from the
 * RATE_LIMIT_WINDOW_MINUTES testing override — 2 min becomes 0.0333...)
 * for a short "(N window)" label — minutes under an hour, otherwise hours,
 * both rounded to whole numbers instead of a raw float. */
export function formatDurationHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  return `${Math.round(hours)}h`
}
