export function formatUsPhoneDigits(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length === 0) return "+1 ";
  if (d.length <= 3) return `+1 (${d}`;
  if (d.length <= 6) return `+1 (${d.slice(0, 3)}) ${d.slice(3)}`;
  return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function extractPhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (raw.trimStart().startsWith("+1")) {
    if (digits.startsWith("1")) digits = digits.slice(1);
  } else if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

/** Format a stored E.164 US phone like "+15185551234" → "+1 (518) 555-1234". */
export function formatStoredUsPhone(phone: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return formatUsPhoneDigits(digits.slice(1));
  }
  if (digits.length === 10) return formatUsPhoneDigits(digits);
  return phone;
}
