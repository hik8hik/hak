"use client";
import { useEffect, useState } from "react"
import type { ContentCard, ContentEdit } from "@/content/types"

interface Props {
  card: ContentCard
  edit?: ContentEdit
  onEdit: (patch: ContentEdit) => void
  onReset: () => void
}

export default function ContentEditor({ card, edit, onEdit, onReset }: Props) {
  const [hook, setHook] = useState(edit?.hook ?? card.hook)
  const [bodyText, setBodyText] = useState((edit?.body ?? card.body).join("\n"))
  const [verdict, setVerdict] = useState(edit?.verdict ?? card.verdict ?? "")
  const [signoff, setSignoff] = useState(edit?.signoff ?? card.signoff ?? "")

  useEffect(() => {
    setHook(edit?.hook ?? card.hook)
    setBodyText((edit?.body ?? card.body).join("\n"))
    setVerdict(edit?.verdict ?? card.verdict ?? "")
    setSignoff(edit?.signoff ?? card.signoff ?? "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id])

  function commit() {
    const patch: ContentEdit = {
      hook,
      body: bodyText.split("\n").map((s) => s.trimEnd()),
      verdict: verdict || undefined,
      signoff: signoff || undefined,
    }
    // Only persist a field if it actually differs from the base card.
    const effective: ContentEdit = {}
    if (hook !== card.hook) effective.hook = hook
    const baseBody = card.body.join("\n")
    if (bodyText !== baseBody) effective.body = patch.body
    if ((verdict || "") !== (card.verdict || "")) effective.verdict = verdict || undefined
    if ((signoff || "") !== (card.signoff || "")) effective.signoff = signoff || undefined
    onEdit(effective)
  }

  return (
    <div className="content-editor">
      <label className="content-field">
        <span>Hook</span>
        <textarea
          rows={2}
          value={hook}
          onChange={(e) => setHook(e.target.value)}
          onBlur={commit}
        />
      </label>
      <label className="content-field">
        <span>Body — one point per line</span>
        <textarea
          rows={Math.max(6, Math.min(14, (edit?.body ?? card.body).length + 1))}
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          onBlur={commit}
        />
      </label>
      <label className="content-field">
        <span>Verdict (optional)</span>
        <input
          type="text"
          value={verdict}
          onChange={(e) => setVerdict(e.target.value)}
          onBlur={commit}
        />
      </label>
      <label className="content-field">
        <span>Sign-off (optional)</span>
        <input
          type="text"
          value={signoff}
          onChange={(e) => setSignoff(e.target.value)}
          onBlur={commit}
        />
      </label>
      <div className="tabs">
        <button className="btn small" onClick={commit}>Save edits</button>
        <button className="btn small" onClick={onReset}>Reset to library</button>
      </div>
    </div>
  )
}