/**
 * Captures an element to PDF using dom-to-image-more, which delegates
 * rendering to the browser (supporting oklch/lab/lch colors) instead of
 * re-implementing CSS parsing like html2canvas does.
 */
export async function captureToPdf(
  element: HTMLElement,
  opts: {
    filename: string;
    orientation?: "portrait" | "landscape";
    header?: string;
  }
) {
  // @ts-expect-error — no bundled types, works at runtime
  const domToImage = (await import("dom-to-image-more")).default;
  const { default: jsPDF } = await import("jspdf");

  const scale = window.devicePixelRatio || 2;
  const width = element.offsetWidth;
  const height = element.offsetHeight;

  const blob: Blob = await domToImage.toBlob(element, {
    width: width * scale,
    height: height * scale,
    style: {
      transform: `scale(${scale})`,
      transformOrigin: "top left",
      width: `${width}px`,
      height: `${height}px`,
    },
  });

  const imgData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

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

  const imgWidth = width * scale;
  const imgHeight = height * scale;
  const maxHeight = pdf.internal.pageSize.getHeight() - topOffset;
  const pdfHeight = Math.min((imgHeight * pdfWidth) / imgWidth, maxHeight);

  pdf.addImage(imgData, "PNG", 0, topOffset, pdfWidth, pdfHeight);
  pdf.save(opts.filename);
}
