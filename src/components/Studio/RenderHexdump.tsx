"use client";
export default function RenderHexdump({ text }: { text: string }) {
  const bytes = new TextEncoder().encode(text);
  const rows: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const slice = bytes.slice(i, i + 16);
    const hex = Array.from(slice).map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const ascii = Array.from(slice).map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ".")).join("");
    rows.push(`${i.toString(16).padStart(8, "0")}  ${hex.padEnd(47)}  |${ascii}|`);
  }
  return (
    <div className="hexdump">
      {rows.map((r, i) => <div key={i}>{r}</div>)}
    </div>
  );
}
