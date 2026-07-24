import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const course = JSON.parse(await fs.readFile(path.join(root, "src/data/course.json"), "utf8"));
const casebook = JSON.parse(await fs.readFile(path.join(root, "src/data/cases.json"), "utf8"));
const records = [];
const chapters = Object.fromEntries(course.chapters.map((chapter) => [chapter.number, chapter.title]));

for (const chapter of course.chapters) {
  chapter.blocks.forEach((block, blockIndex) => {
    const anchor = block.id || `c${chapter.number}-b${String(blockIndex).padStart(3, "0")}`;
    const base = {
      chapter: chapter.number,
      phase: chapter.phase
    };

    if (["paragraph", "heading", "eyebrow", "caption"].includes(block.type) && block.text) {
      records.push({ ...base, anchor, text: block.text, kind: block.type });
    }
    if (block.type === "list") {
      block.items?.forEach((item, index) => records.push({
        ...base,
        anchor: `${anchor}-i${String(index).padStart(2, "0")}`,
        text: item,
        kind: "list-item"
      }));
    }
    if (block.type === "table" && block.rows?.length) {
      records.push({ ...base, anchor, text: block.rows.flat().join(" "), kind: "table" });
    }
    if (block.type === "image" && block.caption) {
      records.push({ ...base, anchor, text: block.caption, kind: "image" });
    }
  });
}

for (const item of casebook.cases) {
  const route = `/casebook/${item.slug}/`;
  const base = {
    chapter: 0,
    title: `${item.symbol} · ${item.title}`,
    phase: 8,
    route,
    label: `CASE ${String(item.number).padStart(2, "0")}`
  };
  records.push({ ...base, anchor: "", text: `${item.market} ${item.date} ${item.context} ${item.title}`, kind: "case-heading" });
  records.push({ ...base, anchor: "", text: item.thesis, kind: "case-thesis" });
  for (const step of item.timeline) {
    records.push({ ...base, anchor: "", text: `${step.id} ${step.title} ${step.facts.join(" ")} ${step.decision}`, kind: "case-step" });
  }
}

await fs.writeFile(path.join(root, "public/search-index.json"), `${JSON.stringify({ version: 2, chapters, records })}\n`);
console.log(JSON.stringify({ records: records.length }));
