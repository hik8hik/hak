// Content studio types.
//
// Distinct from the payload studio: content cards are human-facing
// and layout-first, not code-first.

export type ContentCategory = "cyber" | "website" | "product";

export type ContentLayout =
  | "hook"
  | "steps"
  | "script"
  | "checklist"
  | "compare"
  | "verdict"
  | "redflags"
  | "twocard";

export type ContentAspect = "9:16" | "16:9" | "1:1" | "4:5";

export interface ContentCard {
  id: string;
  category: ContentCategory;
  series: string;
  layout: ContentLayout;
  hook: string;
  body: string[];
  verdict?: string;
  signoff?: string;
  tags?: string[];
}

export interface ContentPreset {
  id: string;
  label: string;
  aspect: ContentAspect;
  w: number;
  h: number;
  pr: number;
}

// CSS pixels x pixelRatio = output pixels. 1x = 1080-wide exports,
// 2x = 2160-wide, which is the practical ceiling for social.
export const CONTENT_PRESETS: ContentPreset[] = [
  { id: "story-hd",   label: "Story HD",   aspect: "9:16", w: 1080, h: 1920, pr: 1 },
  { id: "story-4k",   label: "Story 4K",   aspect: "9:16", w: 1080, h: 1920, pr: 2 },
  { id: "wide-hd",    label: "Wide HD",    aspect: "16:9", w: 1920, h: 1080, pr: 1 },
  { id: "wide-4k",    label: "Wide 4K",    aspect: "16:9", w: 1920, h: 1080, pr: 2 },
  { id: "square-2k",  label: "Square 2K",  aspect: "1:1",  w: 1080, h: 1080, pr: 2 },
  { id: "portrait-4k",label: "Portrait 4K",aspect: "4:5",  w: 1080, h: 1350, pr: 2 },
];

export function presetById(id: string): ContentPreset {
  return CONTENT_PRESETS.find((p) => p.id === id) || CONTENT_PRESETS[0];
}

export interface ContentEdit {
  hook?: string;
  body?: string[];
  verdict?: string;
  signoff?: string;
}

export type ContentEdits = Record<string, ContentEdit>;

export function applyEdit(card: ContentCard, edit?: ContentEdit): ContentCard {
  if (!edit) return card;
  return {
    ...card,
    hook: edit.hook ?? card.hook,
    body: edit.body ?? card.body,
    verdict: edit.verdict ?? card.verdict,
    signoff: edit.signoff ?? card.signoff,
  };
}