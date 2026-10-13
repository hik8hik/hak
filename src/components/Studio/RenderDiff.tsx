"use client";
import { diffLines } from "diff";

export default function RenderDiff({ left, right }: { left: string; right: string }) {
  const parts = diffLines(left, right);
  let lnum = 1, rnum = 1;
  return (
    <div className="diff-rows">
      {parts.flatMap((part, pi) => {
        const lines = part.value.replace(/\n$/, "").split("\n");
        return lines.map((ln, li) => {
          const kind = part.added ? "add" : part.removed ? "del" : "";
          const gutter = part.added ? `+${rnum++}` : part.removed ? `-${lnum++}` : `${lnum++}|${rnum++}`;
          return (
            <div className={`diff-row ${kind}`} key={`${pi}-${li}`}>
              <span className="gutter">{gutter}</span>
              <span className="body">{ln || "\u00a0"}</span>
            </div>
          );
        });
      })}
    </div>
  );
}
