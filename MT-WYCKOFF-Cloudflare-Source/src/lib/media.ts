import mediaData from "../data/media.json";

export type TeachingMedia = {
  id: string;
  chapter: number;
  section: string;
  role: "opening" | "principle";
  kind: "image" | "diagram";
  variant?: "sampling-sot" | "liquidity-map" | "profile-contract" | "value-scenarios" | "footprint-grid" | "decision-ladder";
  src?: string;
  width?: number;
  height?: number;
  alt: string;
  caption: string;
  source: string;
  revision: number;
};

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid media data: ${message}`);
}

function validateMedia(value: unknown) {
  invariant(Array.isArray(value), "root must be an array");
  const ids = new Set<string>();
  for (const entry of value as Array<Record<string, unknown>>) {
    invariant(typeof entry.id === "string" && !ids.has(entry.id), "media id must be unique");
    ids.add(entry.id);
    invariant(Number.isInteger(entry.chapter) && Number(entry.chapter) >= 1 && Number(entry.chapter) <= 30, `${entry.id} has an invalid chapter`);
    invariant(entry.section === "opening" || /^\d+\.\d+$/.test(String(entry.section)), `${entry.id} has an invalid section`);
    invariant(entry.role === "opening" || entry.role === "principle", `${entry.id} has an invalid role`);
    invariant(entry.kind === "image" || entry.kind === "diagram", `${entry.id} has an invalid kind`);
    invariant(typeof entry.alt === "string" && entry.alt.length > 0, `${entry.id} needs alt text`);
    invariant(typeof entry.caption === "string" && entry.caption.length > 0, `${entry.id} needs a caption`);
    invariant(typeof entry.source === "string" && entry.source.length > 0, `${entry.id} needs provenance`);
    invariant(Number.isInteger(entry.revision) && Number(entry.revision) > 0, `${entry.id} needs a revision`);
    if (entry.kind === "image") {
      invariant(typeof entry.src === "string" && entry.src.startsWith("/"), `${entry.id} needs an absolute src`);
      invariant(Number(entry.width) > 0 && Number(entry.height) > 0, `${entry.id} needs dimensions`);
    } else {
      invariant(typeof entry.variant === "string", `${entry.id} needs a diagram variant`);
    }
  }
}

validateMedia(mediaData);

export const teachingMedia = mediaData as TeachingMedia[];

export function getChapterOpeningMedia(chapter: number) {
  return teachingMedia.find((entry) => entry.chapter === chapter && entry.role === "opening");
}

export function getSectionMedia(chapter: number, section: string) {
  return teachingMedia.filter((entry) => entry.chapter === chapter && entry.section === section && entry.role === "principle");
}
