export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type ChecklistGroup = {
  title: string;
  items: ChecklistItem[];
};

function normalizeTitle(raw: string): string {
  // Remove emojis/símbolos no início e percentuais entre parênteses
  let t = raw
    .replace(/^([\p{Emoji_Presentation}\p{Emoji}\p{So}\*#]+\s*)+/u, "")
    .replace(/\(\d+%.*?\)/g, "")
    .replace(/✅|⏳|⚠️|🚀|🐛|📊|🎯|🏗️|🔧|📈|🎨|📚|🚨/g, "")
    .trim();
  // Normaliza múltiplos espaços
  t = t.replace(/\s{2,}/g, " ");
  return t;
}

/**
 * Faz um parse simples do PRD em Markdown e retorna grupos com checkboxes.
 * Regras:
 * - Considera o último heading de nível 3 (###) como título do grupo ativo
 * - Linhas que começam com "- [x]" ou "- [ ]" viram itens do grupo atual
 * - Ignora conteúdo fora desses padrões
 */
export function parsePrdMarkdown(markdown: string): ChecklistGroup[] {
  const lines = markdown.split(/\r?\n/);
  const groups: ChecklistGroup[] = [];
  let currentGroup: ChecklistGroup | null = null;

  const pushGroup = () => {
    if (currentGroup && currentGroup.items.length > 0) {
      groups.push(currentGroup);
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Novo grupo: headings nível 3
    if (line.startsWith("### ")) {
      pushGroup();
      const title = normalizeTitle(line.replace(/^###\s+/, "").trim());
      currentGroup = { title, items: [] };
      continue;
    }

    // Itens de checklist
    if (line.startsWith("- [x]") || line.startsWith("- [ ]")) {
      if (!currentGroup) {
        // Cria um grupo genérico se ainda não houver
        currentGroup = { title: "Checklist", items: [] };
      }
      const done = line.startsWith("- [x]");
      const label = line.replace(/^- \[(x| )\]\s*/, "").trim();
      const id = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      currentGroup.items.push({ id, label, done });
      continue;
    }
  }

  pushGroup();

  // Pós-processamento: mesclar grupos repetidos de mesmo título sequenciais
  const merged: ChecklistGroup[] = [];
  for (const g of groups) {
    const last = merged[merged.length - 1];
    if (last && last.title === g.title) {
      last.items.push(...g.items);
    } else {
      merged.push({ title: g.title, items: [...g.items] });
    }
  }

  // Filtrar grupos vazios por segurança
  return merged.filter((g) => g.items.length > 0);
}


