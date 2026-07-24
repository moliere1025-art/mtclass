const PROGRESS_KEY = "mtwyckoff:progress:v1";
const root = document.querySelector<HTMLElement>("[data-reader-root]");
const progressBar = document.querySelector<HTMLElement>("[data-reading-progress]");
const sideProgress = document.querySelector<HTMLElement>("[data-side-progress]");
let lastPercent = 0;
let progressFrame = 0;

function saveProgress(percent: number) {
  if (!root) return;
  const number = root.dataset.chapter || "0";
  const title = root.dataset.chapterTitle || "";
  try {
    const store = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    const previous = store[number]?.percent || 0;
    const maximum = Math.max(previous, percent);
    store[number] = {
      percent: Math.round(maximum * 10) / 10,
      complete: maximum >= 96,
      title,
      timestamp: Date.now()
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
  } catch {
    // Reading remains fully usable when storage is disabled.
  }
}

let saveTimer = 0;
function updateProgress() {
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const percent = Math.max(0, Math.min(100, window.scrollY / max * 100));
  lastPercent = percent;
  const transform = `scaleX(${percent / 100})`;
  if (progressBar) progressBar.style.transform = transform;
  if (sideProgress) sideProgress.style.transform = transform;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => saveProgress(percent), 350);
}

function scheduleProgress() {
  if (progressFrame) return;
  progressFrame = window.requestAnimationFrame(() => {
    progressFrame = 0;
    updateProgress();
  });
}

function flushProgress() {
  window.clearTimeout(saveTimer);
  saveProgress(lastPercent);
}

function initSectionObserver() {
  const sections = [...document.querySelectorAll<HTMLElement>("[data-reader-section]")];
  const sidebarSection = document.querySelector<HTMLElement>("[data-sidebar-section]");
  const headerSection = document.querySelector<HTMLElement>("[data-header-section]");
  const links = new Map(
    [...document.querySelectorAll<HTMLAnchorElement>("[data-section-link]")].map((link) => [link.dataset.sectionLink, link])
  );
  if (!sections.length) return;

  const activate = (id: string) => {
    links.forEach((link, key) => link.classList.toggle("is-active", key === id));
    const activeIndex = sections.findIndex((section) => section.id === id);
    const sectionNumber = String(activeIndex + 1).padStart(2, "0");
    if (sidebarSection && activeIndex >= 0) sidebarSection.textContent = sectionNumber;
    if (headerSection && activeIndex >= 0) headerSection.textContent = sectionNumber;
    const drawer = document.querySelector<HTMLElement>("[data-sidebar]");
    if (drawer?.classList.contains("is-open")) links.get(id)?.scrollIntoView({ block: "nearest" });
  };

  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible[0]) activate(visible[0].target.id);
  }, { rootMargin: "-18% 0px -68% 0px", threshold: [0, .1] });

  sections.forEach((section) => observer.observe(section));
  activate(sections[0].id);
}

function initMotion() {
  const figures = [...document.querySelectorAll<HTMLElement>("[data-figure-reveal]")];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const desktop = window.matchMedia("(min-width: 681px)").matches;

  if (!desktop || reduced) {
    figures.forEach((figure) => figure.classList.add("is-revealed"));
    document.documentElement.classList.add("motion-ready");
    return;
  }

  requestAnimationFrame(() => document.documentElement.classList.add("motion-ready"));
  if (!figures.length || !("IntersectionObserver" in window)) {
    figures.forEach((figure) => figure.classList.add("is-revealed"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
  figures.forEach((figure) => observer.observe(figure));
}

window.addEventListener("scroll", scheduleProgress, { passive: true });
window.addEventListener("resize", scheduleProgress, { passive: true });
window.addEventListener("pagehide", () => {
  if (progressFrame) {
    window.cancelAnimationFrame(progressFrame);
    progressFrame = 0;
    updateProgress();
  }
  flushProgress();
});

updateProgress();
initSectionObserver();
initMotion();
