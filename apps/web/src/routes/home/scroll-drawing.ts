// Start complete for SSR and draw each stroke in order while scrolling.
export function scrollDrawing(node: HTMLElement) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const strokes = Array.from(
    node.querySelectorAll<SVGPathElement>("[data-draw]"),
  );
  let frame = 0;
  let visible = true;
  function paint() {
    const rect = node.getBoundingClientRect();
    const start = window.innerHeight * 0.82;
    const travel = Math.max(
      rect.height * 0.55,
      rect.height - window.innerHeight * 0.24,
    );
    const progress = preference.matches
      ? 1
      : Math.min(1, Math.max(0, (start - rect.top) / travel));
    node.dataset.drawingProgress = String(progress);
    for (const stroke of strokes) {
      const from = Number(stroke.dataset.from ?? 0);
      const to = Number(stroke.dataset.to ?? 1);
      const local = Math.min(1, Math.max(0, (progress - from) / (to - from)));
      // No dash at completion: non-scaling form strokes must not leave a tiny
      // gap when their SVG is stretched to a newly mounted or resized form.
      stroke.style.strokeDasharray = local === 1 ? "none" : "1";
      stroke.style.strokeDashoffset = String(1 - local);
    }
    for (const label of node.querySelectorAll<HTMLElement>("[data-reveal]")) {
      label.style.opacity = String(
        Math.min(
          1,
          Math.max(0, (progress - Number(label.dataset.reveal)) * 10),
        ),
      );
    }
  }
  function update() {
    cancelAnimationFrame(frame);
    if (visible || preference.matches) frame = requestAnimationFrame(paint);
  }
  // Paint off-screen sections before their first intersection, too.
  paint();
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) update();
    },
    { rootMargin: "25% 0px" },
  );
  observer.observe(node);
  const resize = new ResizeObserver(update);
  resize.observe(node);
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update, { passive: true });
  preference.addEventListener("change", paint);
  return {
    destroy() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      preference.removeEventListener("change", paint);
    },
  };
}
