"use client";

const TICKET_ALLOWED_HTML_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "del",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

const TICKET_TAG_ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
  img: new Set(["src", "alt", "title"]),
};

export function sanitizeTicketRenderedHtml(
  html: string,
) {
  if (!html.trim() || typeof window === "undefined") return html;

  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

  const sanitizeNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      if (!TICKET_ALLOWED_HTML_TAGS.has(tagName)) {
        const fragment = document.createDocumentFragment();
        while (element.firstChild) {
          fragment.appendChild(element.firstChild);
        }
        element.replaceWith(fragment);
        fragment.childNodes.forEach(sanitizeNode);
        return;
      }

      const allowedAttributes = new Set([
        ...(TICKET_TAG_ALLOWED_ATTRIBUTES[tagName] ?? new Set<string>()),
      ]);

      for (const attribute of Array.from(element.attributes)) {
        const attributeName = attribute.name.toLowerCase();
        const attributeValue = attribute.value.trim();

        if (attributeName.startsWith("on")) {
          element.removeAttribute(attribute.name);
          continue;
        }

        if (attributeName === "class") {
          element.removeAttribute(attribute.name);
          continue;
        }

        if (!allowedAttributes.has(attributeName)) {
          element.removeAttribute(attribute.name);
          continue;
        }

        if ((attributeName === "href" || attributeName === "src") && !isSafeTicketHtmlUrl(tagName, attributeName, attributeValue)) {
          element.removeAttribute(attribute.name);
          continue;
        }

        if (tagName === "a" && attributeName === "target") {
          element.setAttribute("target", "_blank");
        }

        if (tagName === "a" && attributeName === "href") {
          element.setAttribute("rel", "noopener noreferrer nofollow");
        }
      }
    }

    node.childNodes.forEach(sanitizeNode);
  };

  document.body.childNodes.forEach(sanitizeNode);
  return document.body.innerHTML;
}

function isSafeTicketHtmlUrl(tagName: string, attributeName: string, value: string) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("javascript:")) return false;
  if (normalized.startsWith("vbscript:")) return false;
  if (normalized.startsWith("data:")) {
    return tagName === "img" && attributeName === "src" && normalized.startsWith("data:image/");
  }
  return true;
}
