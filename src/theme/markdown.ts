function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}

function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part) => {
    if (part.startsWith("**") && part.endsWith("**")) return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link && link[2].startsWith("/")) return `<a class="text-primary" href="${escapeHtml(link[2])}">${escapeHtml(link[1])}</a>`;
    return escapeHtml(part);
  }).join("");
}

export function renderMarkdown(source: string) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const nodes: string[] = [];
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length === 0) return;
    nodes.push(`<p class="mt-4">${inline(para.join(""))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const listClass = list.type === "ul" ? "list-disc" : "list-decimal";
    nodes.push(`<${list.type} class="mt-4 space-y-2 pl-5 ${listClass}">${list.items.map((item) => `<li>${inline(item)}</li>`).join("")}</${list.type}>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      flushPara();
      continue;
    }
    if (line === "---" || line === "***") {
      flushPara();
      flushList();
      nodes.push('<hr class="my-8 border-hairline" />');
      continue;
    }
    if (line.startsWith("## ")) {
      flushPara();
      flushList();
      nodes.push(`<h2 class="font-display mt-10 text-[28px] font-semibold leading-[1.14] tracking-[0.196px]">${inline(line.slice(3))}</h2>`);
      continue;
    }
    const bullet = line.match(/^[-*] (.+)$/);
    if (bullet?.[1]) {
      flushPara();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }
    const numbered = line.match(/^\d+\. (.+)$/);
    if (numbered?.[1]) {
      flushPara();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return nodes.join("");
}
