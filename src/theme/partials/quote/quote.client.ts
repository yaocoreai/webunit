import {
  buildSheet,
  parseDays,
  parseYuan,
  type ClientId,
  type InvoiceId,
  type QuoteCopy,
  type RateTable,
} from "@/theme/partials/quote/quote";
import type { Locale } from "@/theme/path";

type RowState = { id: string; on: boolean; amount: string };
type CustomRow = { key: string; name: string; amount: string; on: boolean };
type QuotePayload = { copy: QuoteCopy; rates: RateTable };

export function mountQuoteCalculator(root: HTMLElement) {
  const locale: Locale = root.dataset.locale === "zh" ? "zh" : "en";
  const payload = JSON.parse(root.querySelector("[data-quote-payload]")?.textContent || "null") as QuotePayload | null;
  if (!payload) return;
  const data = payload.copy;
  const rows: RowState[] = data.presets.map((preset) => ({
    id: preset.id,
    on: true,
    amount: preset.amount == null ? "" : String(preset.amount),
  }));
  const custom: CustomRow[] = [];
  let client: ClientId = "new";
  let invoice: InvoiceId = "normal";
  let daysOn = true;
  let daysText = "32";
  let seq = 1;
  let focusId = "";

  const paint = () => {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement.id : "";
    if (active) focusId = active;
    root.replaceChildren(view());
    if (!focusId) return;
    const next = root.querySelector<HTMLElement>(`#${CSS.escape(focusId)}`);
    if (next instanceof HTMLInputElement || next instanceof HTMLSelectElement) {
      next.focus();
      if (next instanceof HTMLInputElement && next.type !== "checkbox") {
        const end = next.value.length;
        next.setSelectionRange(end, end);
      }
    }
  };

  const view = () => {
    const typedDays = parseDays(daysText);
    const daysInvalid = daysText.trim() !== "" && typedDays == null;
    const totalDays = daysOn ? (typedDays ?? 0) : 0;
    const priced = [
      ...rows.flatMap((row) => {
        if (!row.on) return [];
        const preset = data.presets.find((item) => item.id === row.id);
        const amount = parseYuan(row.amount);
        if (!preset || amount == null || amount === 0) return [];
        return [{ name: preset.name, amount }];
      }),
      ...custom.flatMap((row) => {
        if (!row.on) return [];
        const name = row.name.trim();
        const amount = parseYuan(row.amount);
        if (!name || amount == null || amount === 0) return [];
        return [{ name, amount }];
      }),
    ];
    const sheet = buildSheet(locale, totalDays, client, invoice, priced, data, payload.rates);
    const byName = (name: string) => sheet.rows.find((row) => row.name === name);
    const bold = new Set([data.functionName, data.serviceSum, data.otherName, data.contractName]);
    const section = el("section");
    section.append(
      h("h2", "font-display text-[40px] font-semibold leading-[1.1]", data.title),
      p("mt-4 max-w-3xl text-[17px] leading-[1.47]", data.lead),
      h("h3", "mt-14 text-[21px] font-semibold", data.servicesTitle),
      p("mt-2 text-[14px] text-muted", data.marketNote),
    );
    const list = el("ul", "mt-4 border-t border-hairline");
    list.append(dayRow(daysInvalid));
    for (const row of rows) {
      const preset = data.presets.find((item) => item.id === row.id);
      if (!preset) continue;
      list.append(presetRow(row, preset.name, preset.detail, row.amount.trim() !== "" && parseYuan(row.amount) == null));
    }
    for (const row of custom) list.append(customRow(row, row.amount.trim() !== "" && parseYuan(row.amount) == null));
    section.append(list);
    const add = el("button", "mt-4 text-primary") as HTMLButtonElement;
    add.type = "button";
    add.textContent = data.addService;
    add.addEventListener("click", () => {
      custom.push({ key: `extra-${seq}`, name: "", amount: "", on: true });
      seq += 1;
      focusId = "";
      paint();
    });
    section.append(add);
    const quote = el("div", "mt-14");
    quote.append(h("h3", "text-[21px] font-semibold", data.quoteTitle), p("mt-2 text-[14px] text-muted", data.valid));
    const table = el("table", "mt-4 w-full border-collapse text-left");
    const body = el("tbody");
    body.append(selectRow(data.client, "quote-client", client, data.clients, (value) => { client = value as ClientId; paint(); }));
    if (locale === "zh") {
      body.append(selectRow(data.invoice, "quote-invoice", invoice, data.invoices, (value) => { invoice = value as InvoiceId; paint(); }));
    }
    for (const name of [data.rateName, data.calcName, data.functionName, data.serviceSum, data.otherName, data.contractName, data.payName]) {
      const row = byName(name);
      if (!row) continue;
      body.append(sheetRow(row.name, row.detail, bold.has(name)));
    }
    table.append(body);
    quote.append(table);
    section.append(quote);
    const notes = el("div", "mt-14");
    notes.append(h("h3", "text-[21px] font-semibold", data.notesTitle));
    const notesList = el("ul", "mt-4 divide-y divide-hairline border-y border-hairline");
    for (const item of data.included) {
      const line = el("li", "grid gap-1 py-3 min-[834px]:grid-cols-[16rem_1fr]");
      line.append(span("font-semibold", item.name), span("", item.detail));
      notesList.append(line);
    }
    notes.append(notesList);
    section.append(notes);
    return section;
  };

  const dayRow = (invalid: boolean) => {
    const item = el("li", "grid items-start gap-3 border-b border-hairline py-4 min-[834px]:grid-cols-[1.25rem_minmax(0,1fr)_11rem]");
    const box = checkbox("quote-days-on", data.daysLabel, daysOn, () => { daysOn = !daysOn; paint(); });
    const copy = el("span", "min-w-0");
    copy.append(span("block font-semibold", data.daysLabel), span("mt-1 block text-[14px] text-muted", invalid ? data.daysInvalid : data.daysHint));
    const amount = el("span", "flex flex-nowrap items-end justify-end gap-2");
    const input = textInput("quote-days", data.daysLabel, daysText, "min-w-0 flex-1 border-b border-ink bg-transparent text-right text-[21px] font-semibold tabular-nums");
    input.inputMode = "decimal";
    input.addEventListener("input", () => { daysText = input.value; paint(); });
    amount.append(input, span("shrink-0 whitespace-nowrap pb-1 text-[14px] text-muted", data.daysUnit));
    item.append(box, copy, amount);
    return item;
  };

  const presetRow = (row: RowState, name: string, detail: string, bad: boolean) => {
    const item = el("li", "grid items-start gap-3 border-b border-hairline py-4 min-[834px]:grid-cols-[1.25rem_minmax(0,1fr)_11rem]");
    const copy = el("span", "min-w-0");
    copy.append(span("block font-semibold", name), span("mt-1 block text-[14px] text-muted", detail));
    if (bad) copy.append(span("mt-1 block text-[14px] text-muted", data.blankAmount));
    const amount = el("span", "flex flex-nowrap items-end justify-end gap-2");
    const input = textInput(`quote-amount-${row.id}`, name, row.amount, "min-w-0 flex-1 border-b border-ink/30 bg-transparent text-right text-[17px] tabular-nums");
    input.inputMode = "decimal";
    input.addEventListener("input", () => { row.amount = input.value; paint(); });
    amount.append(input, span("shrink-0 whitespace-nowrap pb-1 text-[14px] text-muted", data.yuanSuffix));
    item.append(
      checkbox(`quote-on-${row.id}`, name, row.on, () => { row.on = !row.on; paint(); }),
      copy,
      amount,
    );
    return item;
  };

  const customRow = (row: CustomRow, bad: boolean) => {
    const item = el("li", "grid items-start gap-3 border-b border-hairline py-4 min-[834px]:grid-cols-[1.25rem_minmax(0,1fr)_11rem]");
    const copy = el("span");
    const name = textInput(`quote-custom-name-${row.key}`, data.customName, row.name, "h-11 w-full border-b border-ink/30 bg-transparent text-[17px]");
    name.placeholder = data.customName;
    name.addEventListener("input", () => { row.name = name.value; paint(); });
    copy.append(name);
    if (bad) copy.append(span("mt-1 block text-[14px] text-muted", data.blankAmount));
    const remove = el("button", "mt-2 text-[14px] text-primary") as HTMLButtonElement;
    remove.type = "button";
    remove.textContent = data.removeService;
    remove.addEventListener("click", () => {
      const index = custom.findIndex((item) => item.key === row.key);
      if (index >= 0) custom.splice(index, 1);
      focusId = "";
      paint();
    });
    copy.append(remove);
    const amountWrap = el("span", "flex flex-nowrap items-end justify-end gap-2");
    const amount = textInput(`quote-custom-amount-${row.key}`, row.name || data.customName, row.amount, "min-w-0 flex-1 border-b border-ink/30 bg-transparent text-right text-[17px] tabular-nums");
    amount.inputMode = "decimal";
    amount.addEventListener("input", () => { row.amount = amount.value; paint(); });
    amountWrap.append(amount, span("shrink-0 whitespace-nowrap pb-1 text-[14px] text-muted", data.yuanSuffix));
    item.append(checkbox(`quote-custom-on-${row.key}`, row.name || data.customName, row.on, () => { row.on = !row.on; paint(); }), copy, amountWrap);
    return item;
  };

  const selectRow = (label: string, id: string, value: string, options: readonly { id: string; label: string }[], onChange: (value: string) => void) => {
    const row = el("tr", "border-b border-hairline");
    const head = el("th", "w-36 py-4 pr-4 text-left align-middle font-normal text-muted") as HTMLTableCellElement;
    head.scope = "row";
    head.textContent = label;
    const cell = el("td", "py-4");
    const select = el("select", "h-11 max-w-full cursor-pointer border-b border-ink/30 bg-transparent text-[17px] w-full max-w-xs") as HTMLSelectElement;
    select.id = id;
    for (const option of options) {
      const item = el("option") as HTMLOptionElement;
      item.value = option.id;
      item.textContent = option.label;
      item.selected = option.id === value;
      select.append(item);
    }
    select.addEventListener("change", () => onChange(select.value));
    cell.append(select);
    row.append(head, cell);
    return row;
  };

  const sheetRow = (name: string, detail: string, strong: boolean) => {
    const row = el("tr", "border-b border-hairline");
    const head = el("th", `w-36 py-4 pr-4 text-left align-top font-normal ${strong ? "font-semibold" : "text-muted"}`) as HTMLTableCellElement;
    head.scope = "row";
    head.textContent = name;
    const cell = el("td", `py-4 tabular-nums ${strong ? "text-[21px] font-semibold" : ""}`);
    cell.textContent = detail;
    row.append(head, cell);
    return row;
  };

  paint();
}

function checkbox(id: string, label: string, checked: boolean, onChange: () => void) {
  const input = el("input", "mt-1") as HTMLInputElement;
  input.id = id;
  input.type = "checkbox";
  input.checked = checked;
  input.setAttribute("aria-label", label);
  input.addEventListener("change", onChange);
  return input;
}

function textInput(id: string, label: string, value: string, className: string) {
  const input = el("input", className) as HTMLInputElement;
  input.id = id;
  input.value = value;
  input.setAttribute("aria-label", label);
  return input;
}

function h(tag: "h2" | "h3", className: string, text: string) {
  const node = el(tag, className);
  node.textContent = text;
  return node;
}

function p(className: string, text: string) {
  return span(className, text, "p");
}

function span(className: string, text: string, tag = "span") {
  const node = el(tag, className);
  node.textContent = text;
  return node;
}

function el(tag: string, className = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}
