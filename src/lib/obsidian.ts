import JSZip from "jszip";
import type { ThreatItem } from "./types";
import { toMarkdown } from "./markdown";

export async function downloadObsidian(items: ThreatItem[]) {
  const zip = new JSZip();
  for (const it of items) {
    const folder = it.kind === "attack" ? "attack" : it.kind === "cwe" ? "cwe" : "cve";
    zip.file(`${folder}/${it.id}.md`, toMarkdown(it));
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "hak-vault.zip";
  a.click();
}
