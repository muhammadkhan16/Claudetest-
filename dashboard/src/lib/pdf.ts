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

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    // html2canvas can't parse lab()/oklch()/lch() — flatten all computed
    // colours to rgb by inlining them on the clone before rendering.
    onclone: (_doc, el) => {
      el.querySelectorAll<HTMLElement>("*").forEach((node) => {
        const cs = window.getComputedStyle(node);
        node.style.color = cs.color;
        node.style.backgroundColor = cs.backgroundColor;
        node.style.borderColor = cs.borderColor;
        node.style.outlineColor = cs.outlineColor;
        node.style.fill = cs.fill;
        node.style.stroke = cs.stroke;
      });
    },
  });

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
