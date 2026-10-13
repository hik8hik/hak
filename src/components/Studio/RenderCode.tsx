"use client";
import { useEffect, useState } from "react";

function guessLang(text: string): string {
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE)\b/im.test(text)) return "sql";
  if (/^\s*(def |import |from .+ import )/m.test(text)) return "python";
  if (/^\s*(Get-|Set-|New-|Invoke-|\$env:)/m.test(text)) return "powershell";
  if (/(#include <|int main\s*\()/.test(text)) return "c";
  if (/<\?php/.test(text)) return "php";
  if (/^(---|\w+:\s)/m.test(text)) return "yaml";
  if (/(const |let |function |=>)/.test(text)) return "javascript";
  return "bash";
}

export default function RenderCode({ text }: { text: string }) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const Prism = (await import("prismjs")).default as any;
      await import("prismjs/components/prism-clike");
      await import("prismjs/components/prism-bash");
      await import("prismjs/components/prism-python");
      await import("prismjs/components/prism-powershell");
      await import("prismjs/components/prism-javascript");
      await import("prismjs/components/prism-c");
      await import("prismjs/components/prism-markup-templating");
      await import("prismjs/components/prism-php");
      await import("prismjs/components/prism-sql");
      await import("prismjs/components/prism-yaml");
      if (cancelled) return;
      const lang = guessLang(text);
      const grammar = Prism.languages[lang] || Prism.languages.clike;
      try { setHtml(Prism.highlight(text, grammar, lang)); } catch { setHtml(text); }
    })().catch(() => { if (!cancelled) setHtml(text); });
    return () => { cancelled = true; };
  }, [text]);
  return <code dangerouslySetInnerHTML={{ __html: html }} />;
}
