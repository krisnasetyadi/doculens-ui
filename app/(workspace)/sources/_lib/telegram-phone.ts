/** A phone number Telegram can send a login code to: international format, starting with "+" and a
 * country code. A local "0821..." looks fine but Telegram does not deliver the code (MS-911), and the
 * country cannot be guessed, so it is refused here instead. Spaces, dashes and brackets are allowed. */
export function isInternationalPhone(value: string): boolean {
  const phone = value.trim();
  return /^\+[\d\s()-]+$/.test(phone) && phone.replace(/\D/g, "").length >= 7;
}
