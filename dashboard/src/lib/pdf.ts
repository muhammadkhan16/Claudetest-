/**
 * High-quality PDF export using dom-to-image-more (handles oklch/lab colors)
 * + jsPDF for layout. Renders at 3× pixel ratio, then slices into A4 pages.
 */
export async function captureToPdf(
  element: HTMLElement,
  opts: {
    filename: string;
    orientation?: "portrait" | "landscape";
    header?: string;
    brand?: string;
  }
) {
  // @ts-expect-error — no bundled types
  const domToImage = (await import("dom-to-image-more")).default;
  const { default: jsPDF } = await import("jspdf");

  const SCALE = 3;
  const orientation = opts.orientation ?? "portrait";

  // ── 1. High-res screenshot ──────────────────────────────────────────────
  const dataUrl: string = await domToImage.toPng(element, { scale: SCALE });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  // ── 2. PDF page setup ────────────────────────────────────────────────────
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();   // 297mm landscape / 210mm portrait
  const pageH = pdf.internal.pageSize.getHeight();  // 210mm landscape / 297mm portrait

  const MARGIN   = 10;   // mm
  const HEADER_H = 18;   // mm
  const FOOTER_H = 9;    // mm
  const contentW = pageW - MARGIN * 2;              // usable width (mm)
  const contentH = pageH - HEADER_H - FOOTER_H;    // usable height per page (mm)

  // ── 3. Compute how many source pixels map to one content-page height ────
  // img.naturalWidth  = element.scrollWidth  × SCALE
  // We render content at full contentW, scaling proportionally
  const srcPageH = Math.round(
    (contentH / contentW) * img.naturalWidth
  ); // source pixels that fill one page height
  const totalPages = Math.ceil(img.naturalHeight / srcPageH);

  // ── 4. Helpers ────────────────────────────────────────────────────────────
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  function addPageChrome(pageNum: number, total: number) {
    // Header gradient bar
    pdf.setFillColor(15, 23, 42);  // slate-900
    pdf.rect(0, 0, pageW, HEADER_H - 2, "F");

    // Blue accent strip
    pdf.setFillColor(37, 99, 235);
    pdf.rect(0, HEADER_H - 4, pageW, 4, "F");

    // Brand/title text in header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.text("AMAZON INTELLIGENCE DASHBOARD", MARGIN, 7);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(148, 163, 184); // slate-400
    if (opts.header) {
      pdf.text(opts.header, pageW / 2, 7, { align: "center" });
    }
    if (opts.brand) {
      pdf.text(opts.brand, pageW / 2, 13, { align: "center" });
    }

    // Page number
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`${pageNum} / ${total}`, pageW - MARGIN, 7, { align: "right" });

    // Date
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(148, 163, 184);
    pdf.text(date, pageW - MARGIN, 13, { align: "right" });

    // Footer
    pdf.setFontSize(6.5);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Generated ${date} · Amazon Intelligence Dashboard · Confidential`,
      pageW / 2,
      pageH - 3,
      { align: "center" }
    );

    // Footer separator
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, pageH - FOOTER_H + 1, pageW - MARGIN, pageH - FOOTER_H + 1);
  }

  // ── 5. Render each page ───────────────────────────────────────────────────
  for (let p = 0; p < totalPages; p++) {
    if (p > 0) pdf.addPage();

    const sy = Math.round(p * srcPageH);
    const sh = Math.min(srcPageH, img.naturalHeight - sy);

    // Slice the source image for this page
    const canvas = document.createElement("canvas");
    canvas.width  = img.naturalWidth;
    canvas.height = sh;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, sy, img.naturalWidth, sh, 0, 0, img.naturalWidth, sh);

    const sliceUrl = canvas.toDataURL("image/png", 1.0);

    // Height this slice occupies on the PDF page (maintain aspect ratio)
    const sliceH = (sh / img.naturalWidth) * contentW;

    addPageChrome(p + 1, totalPages);

    pdf.addImage(
      sliceUrl, "PNG",
      MARGIN,        // x
      HEADER_H,      // y (below header)
      contentW,      // width mm
      Math.min(sliceH, contentH), // height mm — never overflow footer
      undefined,
      "FAST"
    );
  }

  pdf.save(opts.filename);
}
