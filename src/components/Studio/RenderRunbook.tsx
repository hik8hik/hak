"use client";
export default function RenderRunbook({ lines }: { lines: string[] }) {
  const steps = lines.filter(Boolean).map((l) => {
    const m = l.match(/^([^:]+):\s*(.*)$/);
    return { label: m ? m[1].trim() : l, detail: m ? m[2].trim() : "" };
  });
  return (
    <div>
      {steps.map((s, i) => (
        <div className="step" key={i}>
          <div className="n">{i + 1}</div>
          <div className="body">
            <div className="label">{s.label}</div>
            {s.detail && <div className="detail">{s.detail}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
