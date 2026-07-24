import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("renders the dynamic seven-phase course contract", async () => {
  const html = await fs.readFile(path.join(root, "dist/client/course/index.html"), "utf8");
  assert.match(html, /aria-label="7 个学习阶段"/);
  assert.doesNotMatch(html, /六个学习阶段/);
  assert.match(html, /V6\.0 · 2026/);
});

test("renders one unified chapter navigation surface", async () => {
  const html = await fs.readFile(path.join(root, "dist/client/chapter/01/index.html"), "utf8");
  assert.match(html, /class="reader-topbar"/);
  assert.match(html, /class="reader-navigator"/);
  assert.match(html, /aria-label="本章小节"/);
  assert.doesNotMatch(html, /class="reader-rail"/);
  assert.doesNotMatch(html, /data-drawer-tab=/);
  assert.doesNotMatch(html, />查看完整章节结构</);
});
