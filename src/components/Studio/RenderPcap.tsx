"use client";
export default function RenderPcap({ text }: { text: string }) {
  const rows = text.split("\n").filter(Boolean);
  return (
    <div className="pcap">
      <div><span className="hdr">No.   Time      Source           Destination      Protocol  Info</span></div>
      {rows.map((r, i) => {
        const cols = r.split(/\s+/);
        const [src = "", dst = "", rest = ""] = [cols[0] || "", cols[1] || "", cols.slice(2).join(" ")];
        return (
          <div key={i}>
            {String(i + 1).padStart(4, " ")}  {String((i * 0.011).toFixed(4)).padEnd(9)}{" "}
            <span className="src">{src.padEnd(16)}</span>{" "}
            <span className="dst">{dst.padEnd(16)}</span>{" "}
            TCP       <span className="info">{rest}</span>
          </div>
        );
      })}
    </div>
  );
}
