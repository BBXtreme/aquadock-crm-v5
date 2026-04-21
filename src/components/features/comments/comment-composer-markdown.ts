/** Insert or wrap markdown at the current textarea selection. */
export function applyMarkdownSnippet(
  value: string,
  start: number,
  end: number,
  snippet: "h2" | "bold" | "italic" | "code" | "codeBlock" | "link" | "bullet" | "ordered" | "task",
): { next: string; focusStart: number; focusEnd: number } {
  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);

  switch (snippet) {
    case "h2": {
      const line = `## ${selected || "Heading"}\n`;
      const next = `${before}${line}${after}`;
      const pos = start + 3 + (selected ? selected.length : "Heading".length);
      return { next, focusStart: selected ? start + 3 : start + 3, focusEnd: pos };
    }
    case "bold": {
      const inner = selected || "bold text";
      const ins = `**${inner}**`;
      const next = `${before}${ins}${after}`;
      const fs = start + 2;
      const fe = fs + inner.length;
      return { next, focusStart: fs, focusEnd: fe };
    }
    case "italic": {
      const inner = selected || "italic text";
      const ins = `_${inner}_`;
      const next = `${before}${ins}${after}`;
      const fs = start + 1;
      const fe = fs + inner.length;
      return { next, focusStart: fs, focusEnd: fe };
    }
    case "code": {
      const inner = selected || "code";
      const ins = `\`${inner}\``;
      const next = `${before}${ins}${after}`;
      const fs = start + 1;
      const fe = fs + inner.length;
      return { next, focusStart: fs, focusEnd: fe };
    }
    case "codeBlock": {
      const inner = selected || "\n";
      const ins = `\`\`\`\n${inner}\n\`\`\`\n`;
      const next = `${before}${ins}${after}`;
      const fs = start + 4;
      const fe = fs + inner.length;
      return { next, focusStart: fs, focusEnd: fe };
    }
    case "link": {
      const inner = selected || "link text";
      const ins = `[${inner}](url)`;
      const next = `${before}${ins}${after}`;
      const fs = start + 1;
      const fe = fs + inner.length;
      return { next, focusStart: fs, focusEnd: fe };
    }
    case "bullet": {
      const line = selected ? `- ${selected}\n` : "- \n";
      const next = `${before}${line}${after}`;
      const fs = start + 2;
      const fe = selected ? start + 2 + selected.length : fs;
      return { next, focusStart: fs, focusEnd: fe };
    }
    case "ordered": {
      const line = selected ? `1. ${selected}\n` : "1. \n";
      const next = `${before}${line}${after}`;
      const fs = start + 3;
      const fe = selected ? start + 3 + selected.length : fs;
      return { next, focusStart: fs, focusEnd: fe };
    }
    case "task": {
      const line = selected ? `- [ ] ${selected}\n` : "- [ ] \n";
      const next = `${before}${line}${after}`;
      const fs = start + 6;
      const fe = selected ? start + 6 + selected.length : fs;
      return { next, focusStart: fs, focusEnd: fe };
    }
    default:
      return { next: value, focusStart: start, focusEnd: end };
  }
}
