/**
 * Indian Mobile Phone formatting and validation utility
 * Standard Indian format: +91 XXXXX XXXXX (10-digit mobile starting with 6, 7, 8, or 9)
 */

export function cleanDigits(input: string): string {
  if (!input) return '';
  return input.replace(/\D/g, '');
}

/**
 * Normalizes an Indian phone number to standard: +91 XXXXX XXXXX
 */
export function formatIndianPhone(input: string): string {
  if (!input) return '';
  const digits = cleanDigits(input);

  // If starts with 91 and has 12 digits, strip country code to get 10 digits
  let core10 = digits;
  if (digits.startsWith('91') && digits.length === 12) {
    core10 = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    core10 = digits.slice(1);
  } else if (digits.length > 10) {
    core10 = digits.slice(-10);
  }

  if (core10.length <= 5) {
    return core10.length > 0 ? `+91 ${core10}` : '';
  }

  const part1 = core10.slice(0, 5);
  const part2 = core10.slice(5, 10);
  return `+91 ${part1} ${part2}`.trim();
}

/**
 * Checks whether the input is a valid 10-digit Indian mobile number
 * Starts with 6, 7, 8, or 9
 */
export function isValidIndianPhone(input: string): boolean {
  if (!input) return false;
  const digits = cleanDigits(input);
  let core10 = digits;
  if (digits.startsWith('91') && digits.length === 12) {
    core10 = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    core10 = digits.slice(1);
  } else if (digits.length > 10) {
    core10 = digits.slice(-10);
  }

  return core10.length === 10 && /^[6-9]\d{9}$/.test(core10);
}

/**
 * Returns raw 10-digit core mobile number (e.g. 9876543210)
 */
export function getCoreIndianPhone(input: string): string {
  if (!input) return '';
  const digits = cleanDigits(input);
  if (digits.startsWith('91') && digits.length === 12) {
    return digits.slice(2);
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return digits.slice(1);
  }
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}
