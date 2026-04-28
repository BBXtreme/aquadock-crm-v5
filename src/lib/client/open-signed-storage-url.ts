"use client";

/**
 * Extensions where a new browser tab is usually wrong: user expects a file on disk so macOS/Windows
 * can open the default app (Typora/VS Code for `.md`, Office for `.docx`, etc.). Web apps cannot
 * spawn native apps; **download with correct filename** is the portable pattern.
 */
const PREFER_FETCH_THEN_DOWNLOAD =
  /\.(?:md|markdown|txt|csv|tex|docx?|xls|xlsx|pptx?|rtf|pages|key|numbers|zip|gz|tgz|7z|rar|dmg|pkg|deb|apk|msi|exe|iso|sql|patch|diff|log|dwg|dxf)$/i;

function basenameOnly(name: string): string {
  const b = name.replace(/^.*[/\\]/u, "").trim();
  return b.length > 0 ? b : "download";
}

async function openInBrowserTabFallback(signedUrl: string): Promise<void> {
  if (window.open(signedUrl, "_blank", "noopener,noreferrer") !== null) {
    return;
  }
  const a = document.createElement("a");
  a.href = signedUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.hidden = true;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * @param displayFileName – `file_name` from `comment_attachments` (basename + extension drives behavior).
 */
export async function openSignedStorageUrl(signedUrl: string, displayFileName?: string | null): Promise<void> {
  const trimmed = typeof displayFileName === "string" ? displayFileName.trim() : "";
  const safeName = basenameOnly(trimmed.length > 0 ? trimmed : "download");

  if (!PREFER_FETCH_THEN_DOWNLOAD.test(safeName)) {
    await openInBrowserTabFallback(signedUrl);
    return;
  }

  try {
    const res = await fetch(signedUrl, { mode: "cors", credentials: "omit" });
    if (!res.ok) {
      await openInBrowserTabFallback(signedUrl);
      return;
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = safeName;
    a.hidden = true;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
  } catch {
    await openInBrowserTabFallback(signedUrl);
  }
}
