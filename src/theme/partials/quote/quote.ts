import type { Locale } from "@/theme/path";

export type ClientId = "new" | "returning";
export type InvoiceId = "normal" | "special";

export type QuoteCopy = {
  title: string;
  lead: string;
  client: string;
  invoice: string;
  servicesTitle: string;
  quoteTitle: string;
  clients: { id: ClientId; label: string }[];
  invoices: { id: InvoiceId; label: string }[];
  included: { name: string; detail: string }[];
  functionName: string;
  serviceSum: string;
  otherName: string;
  contractName: string;
  payName: string;
  presets: { id: string; name: string; detail: string; amount: number | null }[];
  daysLabel: string;
  daysUnit: string;
  daysHint: string;
  daysInvalid: string;
  marketNote: string;
  addService: string;
  customName: string;
  removeService: string;
  valid: string;
  hoursName: string;
  rateName: string;
  calcName: string;
  blankAmount: string;
  yuanSuffix: string;
  notesTitle: string;
};

export type Rate = {
  dayAmount: number;
  monthAmount: number;
  day: string;
  month: string;
};

export type RateTable = {
  newClient: Rate;
  returning: Rate;
};

export type SheetRow = { name: string; detail: string };
export type PricedService = { name: string; amount: number };

function yuan(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const withComma = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (frac === 0) return `${sign}${withComma}`;
  return `${sign}${withComma}.${String(frac).padStart(2, "0")}`;
}

function money(cents: number, suffix: string) {
  return `${yuan(cents)} ${suffix}`;
}

function functionParts(days: number, dayAmount: number, monthAmount: number, locale: Locale, suffix: string) {
  const tenths = Math.round(days * 10);
  const dayText = yuan(dayAmount * 100);
  const monthText = yuan(monthAmount * 100);
  if (tenths < 220) {
    const cents = tenths * dayAmount * 10;
    return {
      cents,
      daysCalc: locale === "zh" ? `${days} 日` : `${days} days`,
      priceCalc: `${days} × ${dayText} = ${money(cents, suffix)}`,
    };
  }
  const months = Math.floor(tenths / 220);
  const restTenths = tenths - months * 220;
  const rest = restTenths / 10;
  const cents = months * monthAmount * 100 + restTenths * dayAmount * 10;
  const covered = months * 22;
  const daysCalc =
    rest === 0
      ? locale === "zh"
        ? `${months} × 22 = ${covered} 日`
        : `${months} × 22 = ${covered} days`
      : locale === "zh"
        ? `${months} × 22 = ${covered} 日，剩余 ${rest} 日`
        : `${months} × 22 = ${covered} days, ${rest} left`;
  const priceCalc =
    rest === 0
      ? `${months} × ${monthText} = ${money(cents, suffix)}`
      : `${months} × ${monthText} + ${rest} × ${dayText} = ${money(cents, suffix)}`;
  return { cents, daysCalc, priceCalc };
}

export function parseDays(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+(\.\d?)?$/.test(trimmed)) return null;
  const numeric = trimmed.endsWith(".") ? trimmed.slice(0, -1) : trimmed;
  if (numeric === "") return null;
  const value = Math.round(Number(numeric) * 10) / 10;
  if (!Number.isFinite(value) || value < 0 || value > 999) return null;
  return value;
}

export function parseYuan(text: string): number | null {
  const trimmed = text.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const value = Math.round(Number(trimmed) * 100) / 100;
  if (value < 0) return null;
  return value;
}

export function buildSheet(
  locale: Locale,
  days: number,
  client: ClientId,
  invoice: InvoiceId,
  services: PricedService[],
  text: QuoteCopy,
  rateTable: RateTable,
): { rows: SheetRow[] } {
  const rate = client === "new" ? rateTable.newClient : rateTable.returning;
  const built = functionParts(days, rate.dayAmount, rate.monthAmount, locale, text.yuanSuffix);
  const serviceCents = services.reduce((sum, line) => sum + Math.round(line.amount * 100), 0);
  const otherCents = 0;
  const contract = built.cents + serviceCents + otherCents;
  const first = Math.round(contract * 0.4);
  const second = Math.round(contract * 0.4);
  const third = contract - first - second;
  const rateLabel = client === "new" ? text.clients[0]?.label ?? "" : text.clients[1]?.label ?? "";
  const serviceDetail =
    services.length === 0
      ? money(0, text.yuanSuffix)
      : `${services.map((line) => yuan(Math.round(line.amount * 100))).join(" + ")} = ${money(serviceCents, text.yuanSuffix)}`;
  const otherDetail =
    invoice === "normal"
      ? `${money(0, text.yuanSuffix)}。普票含在开发里，这一笔是 0。`
      : `${money(otherCents, text.yuanSuffix)}。报价不另写专票加价。这一笔是 0。依法纳税。`;
  const sum =
    locale === "zh"
      ? `${yuan(built.cents)} + ${yuan(serviceCents)} + ${yuan(otherCents)} = ${money(contract, text.yuanSuffix)}`
      : `${yuan(built.cents)} + ${yuan(serviceCents)} = ${money(contract, text.yuanSuffix)}`;
  return {
    rows: [
      { name: text.hoursName, detail: String(days) },
      {
        name: text.rateName,
        detail:
          locale === "zh"
            ? `${rateLabel} ${rate.day} 元/日，每人每日。满 22 日 ${rate.month} 元/月`
            : `${rateLabel} ${rate.day} yuan/day, ${rate.month} yuan/month from 22 days`,
      },
      { name: text.calcName, detail: built.daysCalc },
      { name: text.functionName, detail: built.priceCalc },
      { name: text.serviceSum, detail: serviceDetail },
      ...(locale === "zh" ? [{ name: text.otherName, detail: otherDetail }] : []),
      {
        name: text.contractName,
        detail: sum,
      },
      {
        name: text.payName,
        detail:
          locale === "zh"
            ? `开工 ${yuan(first)}（40%），上线 ${yuan(second)}（40%），验收 ${yuan(third)}（20%）。按合同合计。常见分法，不是固定比例。`
            : `Start ${yuan(first)} (40%), launch ${yuan(second)} (40%), acceptance ${yuan(third)} (20%). From the contract total. A common split, not a fixed one.`,
      },
    ],
  };
}
