import principleData from "../data/principles.json";

export type Principle = {
  id: string;
  chapter: number;
  section: string;
  title: string;
  mechanism: string;
  evidence: string[];
  counterexample: string;
  invalidation: string;
};

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid principle data: ${message}`);
}

const ids = new Set<string>();
for (const item of principleData as Array<Record<string, unknown>>) {
  invariant(typeof item.id === "string" && !ids.has(item.id), "principle id must be unique");
  ids.add(item.id);
  invariant(Number.isInteger(item.chapter), `${item.id} needs a chapter`);
  invariant(/^\d+\.\d+$/.test(String(item.section)), `${item.id} needs a section`);
  invariant(typeof item.mechanism === "string" && item.mechanism.length > 0, `${item.id} needs a mechanism`);
  invariant(Array.isArray(item.evidence) && item.evidence.length >= 3, `${item.id} needs observable evidence`);
  invariant(typeof item.counterexample === "string" && item.counterexample.length > 0, `${item.id} needs a counterexample`);
  invariant(typeof item.invalidation === "string" && item.invalidation.length > 0, `${item.id} needs invalidation`);
}

export const principles = principleData as Principle[];

export function getSectionPrinciples(chapter: number, section: string) {
  return principles.filter((item) => item.chapter === chapter && item.section === section);
}
