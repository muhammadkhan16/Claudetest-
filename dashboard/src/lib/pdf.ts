const COLOR_PROPS = [
  "color",
  "background-color",
  "border-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "text-decoration-color",
  "fill",
  "stroke",
] as const;

/**
 * Inline all computed colours on every descendant as rgb() values so that
 * html2canvas never has to parse oklch()/lab()/lch() from stylesheets.
 * Returns a cleanup function that restores the original inline values.
 */
function inlineColors(root: HTMLElement): () => void {
  type Backup = { el: HTMLElement; saved: Partial<Record<string, string>> };
  const backups: Backup[] = [];

  root.querySelectorAll<HTMLElement>("*").forEach((node) => {
    const cs = window.getComputedStyle(node);
    const saved: Partial<Record<string, string>> = {};

    COLOR_PROPS.forEach((prop) => {
      const computed = cs.getPropertyValue(prop);
      if (!computed) return;
      saved[prop] = node.style.getPropertyValue(prop); // may be ""
      node.style.setProperty(prop, computed);
    });

    backups.push({ el: node, saved });
  });

  return () => {
    backups.forEach(({ el, saved }) => {
      COLOR_PROPS.forEach((prop) => {
        const orig = saved[prop];
        if (orig) {
          el.style.setProperty(prop, orig);
        } else {
          el.style.removeProperty(prop);
        }
      });
    });
  };
}

export async function captureToPdf(
  element: HTMLElement,
  opts: {
    filename: string;
    orientation?: "portrait" | "landscape";
    header?: string;
  }
) {
  const { default: html2canvas } = await import("html2canvas");
  const { default: jsPDF } = await import("jspdf");

  // Flatten oklch/lab colors to rgb BEFORE html2canvas reads the DOM.
  const restore = inlineColors(element);

  let canvas;
  try {
    canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
  } finally {
    restore();
  }

  const imgData = canvas.toDataURL("image/png");
  const orientation = opts.orientation ?? "portrait";
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pdfWidth = pdf.internal.pageSize.getWidth();

  let topOffset = 0;
  if (opts.header) {
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(opts.header, 10, 8);
    topOffset = 12;
  }

  const maxHeight = pdf.internal.pageSize.getHeight() - topOffset;
  const pdfHeight = Math.min(
    (canvas.height * pdfWidth) / canvas.width,
    maxHeight
  );
  pdf.addImage(imgData, "PNG", 0, topOffset, pdfWidth, pdfHeight);
  pdf.save(opts.filename);
}
