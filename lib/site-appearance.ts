export type SiteAppearance = "light" | "dark" | "ignyte";
let ignitionTimer: ReturnType<typeof setTimeout> | undefined;

export function applySiteAppearance(next: SiteAppearance) {
  const root = document.documentElement;
  const activatingIgnyte = next === "ignyte" && root.dataset.appearance !== "ignyte";
  root.dataset.appearance = next;
  if (ignitionTimer) clearTimeout(ignitionTimer);
  delete root.dataset.ignyteIgniting;
  if (activatingIgnyte && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.dataset.ignyteIgniting = "true";
    ignitionTimer = setTimeout(() => { delete root.dataset.ignyteIgniting; }, 2100);
  }
  localStorage.setItem("ignyte-appearance", next);
  window.dispatchEvent(new Event("ignyte-appearance-change"));
}
