export function markdownToPlainText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/<[^>]*>?/gm, " ")
    .replace(/```([\s\S]*?)```/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1 $2")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function normalizeTicketMarkdownInput(value: string) {
  if (!/<[a-z][\s\S]*>/i.test(value)) {
    return value;
  }

  return value
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<ol[^>]*>|<\/ol>|<ul[^>]*>|<\/ul>/gi, "\n")
    .replace(/<h2[^>]*>/gi, "## ")
    .replace(/<\/h2>/gi, "\n\n")
    .replace(/<h3[^>]*>/gi, "### ")
    .replace(/<\/h3>/gi, "\n\n")
    .replace(/<blockquote[^>]*>/gi, "> ")
    .replace(/<\/blockquote>/gi, "\n\n")
    .replace(/<pre[^>]*><code[^>]*>/gi, "```\n")
    .replace(/<\/code><\/pre>/gi, "\n```\n")
    .replace(/<code[^>]*>/gi, "`")
    .replace(/<\/code>/gi, "`")
    .replace(/<strong[^>]*>|<b[^>]*>/gi, "**")
    .replace(/<\/strong>|<\/b>/gi, "**")
    .replace(/<em[^>]*>|<i[^>]*>/gi, "_")
    .replace(/<\/em>|<\/i>/gi, "_")
    .replace(/<u[^>]*>|<\/u>/gi, "")
    .replace(/<[^>]*>?/gm, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function appendMarkdownBlock(current: string, nextBlock: string) {
  const currentValue = current.trimEnd();
  const nextValue = nextBlock.trim();

  if (!nextValue) {
    return current;
  }

  if (!currentValue) {
    return nextValue;
  }

  return `${currentValue}\n\n${nextValue}`;
}
