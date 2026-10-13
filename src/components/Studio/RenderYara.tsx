"use client";
export default function RenderYara({ text }: { text: string }) {
  const html = text
    .replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string))
    .replace(/\b(rule|meta|strings|condition|and|or|not|any|all|of|them|true|false)\b/g, '<span class="kw">$1</span>')
    .replace(/"([^"]*)"/g, '<span class="str">"$1"</span>')
    .replace(/\b(contains|matches|startswith|endswith|filesize|entrypoint)\b/g, '<span class="cond">$1</span>');
  return <code dangerouslySetInnerHTML={{ __html: html }} />;
}
