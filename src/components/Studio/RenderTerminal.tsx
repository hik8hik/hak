"use client";
export default function RenderTerminal({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((l, i) => <div className="ln" key={i}>{l || "\u00a0"}</div>)}
      <span className="cursor" />
    </>
  );
}
