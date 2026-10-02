import type { StringFormat } from "../types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)?$/;
const dateTimePattern = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

export function matchesStringFormat(format: StringFormat, value: string): boolean {
  switch (format) {
    case "email":
      return value.length <= 254 && emailPattern.test(value);
    case "uuid":
      return uuidPattern.test(value);
    case "url":
      try {
        const url = new URL(value);
        return Boolean(url.protocol && url.hostname);
      } catch {
        return false;
      }
    case "hostname":
      try {
        return new URL(`https://${value}`).hostname === value.toLowerCase();
      } catch {
        return false;
      }
    case "date-time":
      return dateTimePattern.test(value) && !Number.isNaN(Date.parse(value));
    case "date":
      return datePattern.test(value) && validDate(value);
    case "time":
      return timePattern.test(value);
    case "locale":
      try {
        new Intl.Locale(value);
        return true;
      } catch {
        return false;
      }
  }
}

function validDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month! - 1 &&
    date.getUTCDate() === day;
}
