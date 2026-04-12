/**
 * Plain-text display helpers for AI enrichment summaries (no HTML/markdown rendering).
 */

function stripDisallowedControlChars(input: string): string {
  let out = "";
  for (const ch of input) {
    const c = ch.codePointAt(0);
    if (c === undefined) {
      continue;
    }
    if (c === 0x09 || c === 0x0a) {
      out += ch;
      continue;
    }
    if (c <= 0x08 || c === 0x0b || c === 0x0c || (c >= 0x0e && c <= 0x1f) || c === 0x7f) {
      continue;
    }
    out += ch;
  }
  return out;
}

/**
 * Strips C0 control characters (except newline/tab) and trailing whitespace for safe plain display.
 * React text nodes escape HTML; this removes invisible / disruptive characters from model output.
 */
export function formatAiEnrichmentSummaryForDisplay(raw: string): string {
  let text = stripDisallowedControlChars(raw);
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");
  return text.trimEnd();
}
