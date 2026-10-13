"use client";
export default function RenderChain({ lines }: { lines: string[] }) {
  const nodes = lines.filter(Boolean);
  return (
    <div className="chain-v">
      {nodes.map((node, i) => (
        <div key={i}>
          <div className="node" data-index={i}>{node}</div>
          {i < nodes.length - 1 && <div className="arrow">↓</div>}
        </div>
      ))}
    </div>
  );
}
