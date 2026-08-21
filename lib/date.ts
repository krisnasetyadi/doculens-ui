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
