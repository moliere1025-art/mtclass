type ProgressEntry = { percent: number; complete: boolean; title: string; timestamp: number };
type ProgressStore = Record<string, ProgressEntry>;

const PROGRESS_KEY = "mtwyckoff:progress:v1";
const FONT_KEY = "mtwyckoff:reader-size";

function readProgress(): ProgressStore {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}") as ProgressStore; }
  catch { return {}; }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character);
}

function highlight(value: string, terms: string[]) {
  if (!terms.length) return escapeHtml(value);
  const pattern = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return value.split(pattern).map((part) => terms.some((term) => part.toLocaleLowerCase("zh-CN") === term) ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)).join("");
}

function initSidebar() {
  const sidebar = document.querySelector<HTMLElement>("[data-sidebar]");
  const scrim = document.querySelector<HTMLButtonElement>("[data-sidebar-scrim]");
  const openers = [...document.querySelectorAll<HTMLButtonElement>("[data-sidebar-open]")];
  if (!sidebar || !scrim) return;
  let returnFocus: HTMLElement | null = null;

  const open = (trigger?: HTMLElement) => {
    returnFocus = trigger || document.activeElement as HTMLElement;
    sidebar.inert = false;
    sidebar.setAttribute("aria-hidden", "false");
    sidebar.classList.add("is-open");
    scrim.classList.add("is-open");
    scrim.tabIndex = 0;
    openers.forEach((button) => button.setAttribute("aria-expanded", "true"));
    document.body.classList.add("is-locked");
    requestAnimationFrame(() => sidebar.querySelector<HTMLButtonElement>("[data-sidebar-close]")?.focus());
  };

  const close = () => {
    sidebar.classList.remove("is-open");
    scrim.classList.remove("is-open");
    scrim.tabIndex = -1;
    sidebar.inert = true;
    sidebar.setAttribute("aria-hidden", "true");
    openers.forEach((button) => button.setAttribute("aria-expanded", "false"));
    document.body.classList.remove("is-locked");
    returnFocus?.focus();
  };

  openers.forEach((button) => button.addEventListener("click", () => open(button)));
  document.querySelectorAll<HTMLElement>("[data-sidebar-close]").forEach((button) => button.addEventListener("click", close));
  sidebar.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
  document.addEventListener("keydown", (event) => {
    if (!sidebar.classList.contains("is-open")) return;
    if (event.key === "Escape") close();
    if (event.key !== "Tab") return;
    const focusable = [...sidebar.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), details summary, [tabindex]:not([tabindex="-1"])')].filter((item) => !item.closest("[hidden]"));
    const first = focusable[0]; const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
}

function initFontControls() {
  const root = document.documentElement;
  const saved = Number(localStorage.getItem(FONT_KEY) || "1");
  let size = Number.isFinite(saved) ? Math.min(1.14, Math.max(.92, saved)) : 1;
  const apply = () => { root.style.setProperty("--reader-size", String(size)); localStorage.setItem(FONT_KEY, String(size)); };
  apply();
  document.querySelectorAll<HTMLButtonElement>("[data-font-size]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.fontSize;
    if (action === "up") size = Math.min(1.14, Math.round((size + .06) * 100) / 100);
    if (action === "down") size = Math.max(.92, Math.round((size - .06) * 100) / 100);
    if (action === "reset") size = 1;
    apply();
  }));
}

function initSearch() {
  const dialog = document.querySelector<HTMLDialogElement>("[data-search-dialog]");
  const input = document.querySelector<HTMLInputElement>("[data-search-input]");
  const results = document.querySelector<HTMLElement>("[data-search-results]");
  const status = document.querySelector<HTMLElement>("[data-search-status]");
  if (!dialog || !input || !results || !status) return;
  type SearchRecord = { chapter: number; title?: string; anchor: string; text: string; kind: string; phase: number; route?: string; label?: string };
  type SearchIndex = { version: number; chapters: Record<string, string>; records: SearchRecord[] } | SearchRecord[];
  let index: SearchRecord[] = [];
  let chapterTitles: Record<string, string> = {};
  let searchable: Array<SearchRecord & { searchText: string; chapterTitle: string }> = [];
  let request: Promise<SearchRecord[]> | undefined;
  let timer = 0;
  let returnFocus: HTMLElement | null = null;

  const loadIndex = () => request ||= fetch("/search-index.json?v=2", { cache: "force-cache" }).then((response) => {
    if (!response.ok) throw new Error("search index unavailable");
    return response.json();
  }).then((data: SearchIndex) => {
    if (Array.isArray(data)) {
      chapterTitles = {};
      index = data;
    } else {
      chapterTitles = data.chapters || {};
      index = data.records || [];
    }
    searchable = index.map((record) => {
      const chapterTitle = record.title || chapterTitles[String(record.chapter)] || "";
      return { ...record, chapterTitle, searchText: `${chapterTitle} ${record.text}`.toLocaleLowerCase("zh-CN") };
    });
    return index;
  });

  const open = async () => {
    returnFocus = document.activeElement as HTMLElement;
    document.querySelector<HTMLButtonElement>("[data-sidebar].is-open [data-sidebar-close]")?.click();
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("is-locked");
    status.textContent = "正在载入课程索引……";
    results.setAttribute("aria-busy", "true");
    try {
      await loadIndex();
      status.textContent = "例如：Spring、Cause、相对强弱、仓位、失败结构";
      requestAnimationFrame(() => input.focus());
    } catch {
      status.textContent = "课程索引暂时无法载入，请关闭后重试。";
      results.innerHTML = '<p class="search-empty">搜索服务当前不可用；阅读内容不受影响。</p>';
    } finally { results.removeAttribute("aria-busy"); }
  };
  const close = () => { dialog.close(); document.body.classList.remove("is-locked"); returnFocus?.focus(); };
  const render = () => {
    const query = input.value.trim().toLocaleLowerCase("zh-CN");
    if (query.length < 2) { results.innerHTML = ""; return; }
    const terms = query.split(/\s+/).filter(Boolean);
    const matches = searchable.filter((record) => terms.every((term) => record.searchText.includes(term))).slice(0, 40);
    status.textContent = matches.length ? `找到 ${matches.length} 条结果` : "没有匹配结果";
    if (!matches.length) { results.innerHTML = '<p class="search-empty">没有找到匹配内容。可以尝试事件名称、章节概念或英文术语。</p>'; return; }
    results.innerHTML = matches.map((record) => {
      const chapter = String(record.chapter).padStart(2, "0");
      const href = record.route || `/chapter/${chapter}/#${encodeURIComponent(record.anchor)}`;
      const label = record.label || `CH ${chapter}`;
      return `<a class="search-result" href="${escapeHtml(href)}"><span class="search-result__chapter">${escapeHtml(label)}</span><p>${highlight(record.text, terms)}</p><small>${highlight(record.chapterTitle, terms)}</small></a>`;
    }).join("");
  };
  document.querySelectorAll<HTMLElement>("[data-search-open]").forEach((button) => button.addEventListener("click", open));
  document.querySelectorAll<HTMLElement>("[data-search-close]").forEach((button) => button.addEventListener("click", close));
  input.addEventListener("input", () => { window.clearTimeout(timer); timer = window.setTimeout(render, 120); });
  dialog.addEventListener("close", () => { document.body.classList.remove("is-locked"); returnFocus?.focus(); });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
}

function initFigures() {
  const dialog = document.querySelector<HTMLDialogElement>("[data-figure-dialog]");
  const image = dialog?.querySelector<HTMLImageElement>("[data-figure-dialog-image]");
  const caption = dialog?.querySelector<HTMLElement>("[data-figure-dialog-caption]");
  const viewport = dialog?.querySelector<HTMLElement>("[data-figure-viewport]");
  if (!dialog || !image || !caption || !viewport) return;
  let zoom = 1;
  let returnFocus: HTMLElement | null = null;
  const applyZoom = () => {
    image.style.width = `${zoom * 100}%`;
    dialog.querySelector<HTMLButtonElement>('[data-figure-zoom="reset"]')!.textContent = `${Math.round(zoom * 100)}%`;
  };
  document.querySelectorAll<HTMLButtonElement>("[data-figure-open]").forEach((button) => button.addEventListener("click", () => {
    returnFocus = button;
    image.src = button.dataset.figureSrc || "";
    image.alt = button.dataset.figureCaption || "课程图表";
    image.removeAttribute("aria-hidden");
    caption.textContent = button.dataset.figureCaption || "";
    zoom = 1; applyZoom(); viewport.scrollTo(0, 0);
    dialog.showModal(); document.body.classList.add("is-locked");
  }));
  dialog.querySelectorAll<HTMLButtonElement>("[data-figure-zoom]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.figureZoom;
    zoom = action === "in" ? Math.min(3, zoom + .25) : action === "out" ? Math.max(.75, zoom - .25) : 1;
    applyZoom();
  }));
  const close = () => {
    dialog.close();
    document.body.classList.remove("is-locked");
    image.removeAttribute("src");
    image.setAttribute("aria-hidden", "true");
    returnFocus?.focus();
  };
  dialog.querySelector("[data-figure-close]")?.addEventListener("click", close);
  dialog.addEventListener("close", () => {
    document.body.classList.remove("is-locked");
    image.setAttribute("aria-hidden", "true");
    returnFocus?.focus();
  });
  dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
}

function initCourseDashboard() {
  const dashboard = document.querySelector<HTMLElement>("[data-course-dashboard]");
  if (!dashboard) return;
  const totalChapters = Number(dashboard.dataset.totalChapters || "0");
  const phaseRanges = JSON.parse(dashboard.dataset.phaseRanges || "[]") as number[][];
  if (!totalChapters) return;
  const progress = readProgress();
  const entries = Object.entries(progress);
  const completed = entries.filter(([, item]) => item.complete).length;
  const totalPercent = Math.round(Object.values(progress).reduce((total, item) => total + Math.min(100, item.percent), 0) / totalChapters);
  dashboard.querySelector<HTMLElement>("[data-total-progress]")!.textContent = `${totalPercent}%`;
  dashboard.querySelector<HTMLElement>("[data-completed-chapters]")!.textContent = String(completed);
  for (let number = 1; number <= totalChapters; number += 1) {
    const item = progress[String(number)];
    const segment = dashboard.querySelector<HTMLElement>(`[data-progress-segment="${number}"]`);
    const label = document.querySelector<HTMLElement>(`[data-card-progress="${number}"]`);
    if (item && segment) segment.classList.add(item.complete ? "is-complete" : "is-started");
    if (item && label) label.textContent = item.complete ? "已完成" : `${Math.round(item.percent)}%`;
  }
  phaseRanges.forEach(([start, end], index) => {
    let total = 0; for (let number = start; number <= end; number += 1) total += Math.min(100, progress[String(number)]?.percent || 0);
    const node = dashboard.querySelector<HTMLElement>(`[data-phase-progress="${index + 1}"]`);
    if (node) node.textContent = `${Math.round(total / (end - start + 1))}%`;
  });
  const last = entries.sort((a, b) => b[1].timestamp - a[1].timestamp)[0];
  if (last) {
    const [number, item] = last; const chapter = String(number).padStart(2, "0");
    dashboard.querySelector<HTMLElement>("[data-last-position]")!.textContent = `最近阅读 · 第 ${chapter} 章 · ${Math.round(item.percent)}%`;
    const link = document.querySelector<HTMLAnchorElement>("[data-continue-link]"); const label = document.querySelector<HTMLElement>("[data-continue-label]");
    if (link) link.href = `/chapter/${chapter}/`; if (label) label.textContent = `继续第 ${chapter} 章`;
  }
}

function initBackToTop() {
  const button = document.querySelector<HTMLButtonElement>("[data-back-to-top]"); if (!button) return;
  const update = () => button.classList.toggle("is-visible", window.scrollY > Math.max(700, window.innerHeight));
  window.addEventListener("scroll", update, { passive: true }); button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" })); update();
}

document.documentElement.classList.add("js");
initSidebar(); initFontControls(); initSearch(); initFigures(); initCourseDashboard(); initBackToTop();
export { PROGRESS_KEY, readProgress };
