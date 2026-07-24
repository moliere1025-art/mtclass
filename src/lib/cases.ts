import caseData from "../data/cases.json";

export type CaseLevel = {
  label: string;
  value: number;
  tone: "neutral" | "accent" | "risk";
};

export type CaseMark = {
  index: number;
  label: string;
  tone: "neutral" | "accent" | "risk";
};

export type CaseTimelineStep = {
  id: string;
  title: string;
  facts: string[];
  decision: string;
};

export type TradingCase = {
  number: number;
  slug: string;
  symbol: string;
  market: string;
  date: string;
  context: string;
  title: string;
  thesis: string;
  dataContract: Record<string, string>;
  chart: {
    path: number[];
    levels: CaseLevel[];
    marks: CaseMark[];
  };
  timeline: CaseTimelineStep[];
  plan: Record<"context" | "location" | "trigger" | "invalidation" | "management", string>;
  questions: string[];
  answer: string[];
};

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid casebook data: ${message}`);
}

function validateCases(value: unknown) {
  invariant(value && typeof value === "object", "root must be an object");
  const data = value as Record<string, unknown>;
  invariant(data.meta && typeof data.meta === "object", "meta is required");
  invariant(Array.isArray(data.cases) && data.cases.length === 6, "exactly six cases are required");
  const slugs = new Set<string>();

  (data.cases as Array<Record<string, unknown>>).forEach((item, index) => {
    const number = item.number as number;
    invariant(number === index + 1, `case ${index + 1} must be sequential`);
    invariant(typeof item.slug === "string" && !slugs.has(item.slug), `case ${number} slug must be unique`);
    slugs.add(item.slug);
    invariant(typeof item.title === "string" && item.title.length > 0, `case ${number} needs a title`);
    invariant(Array.isArray(item.timeline) && item.timeline.length >= 3, `case ${number} needs at least three reveal steps`);
    invariant(Array.isArray(item.questions) && Array.isArray(item.answer) && item.questions.length === item.answer.length, `case ${number} questions and answers must match`);
    const chart = item.chart as Record<string, unknown>;
    invariant(Array.isArray(chart.path) && chart.path.length >= 8, `case ${number} needs a chart path`);
    invariant((chart.path as unknown[]).every((point) => typeof point === "number" && point >= 0 && point <= 100), `case ${number} chart values must be normalized`);
  });
}

validateCases(caseData);

export const casebook = caseData as unknown as { meta: { title: string; subtitle: string; method: string }; cases: TradingCase[] };

export function getCase(slug: string) {
  return casebook.cases.find((item) => item.slug === slug);
}

export function padCase(number: number) {
  return String(number).padStart(2, "0");
}
