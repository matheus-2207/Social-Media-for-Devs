import "server-only";
import hljs from "highlight.js/lib/common";

export function highlightCode(code: string, language: string | null): string {
  const safeLanguage = language && hljs.getLanguage(language) ? language : "plaintext";
  // Somente o HTML escapado e gerado pelo highlighter é renderizado no PostCard.
  return hljs.highlight(code, { language: safeLanguage, ignoreIllegals: true }).value;
}
