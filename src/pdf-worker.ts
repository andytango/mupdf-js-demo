import initMuPdf, { MuPdf } from "mupdf-js";
import { ConversionMode } from "./ConversionMode";

self.addEventListener("message", handleMessage);

let pdf: MuPdf.Instance | undefined;

initMuPdf().then((mupdf: MuPdf.Instance) => {
  pdf = mupdf;
});

function handleMessage(e: MessageEvent) {
  if (e.data.type === "exec") {
    processFile(e.data.file, e.data.mode).then((val: string | void) => {
      self.postMessage(val);
    });
  }
}

async function processFile(file: File | null, mode: ConversionMode) {
  if (!pdf) {
    throw new Error("MuPDF is not ready");
  }

  if (!file) {
    throw new Error("Invalid file");
  }

  const buf = await file.arrayBuffer();
  const doc = pdf.load(new Uint8Array(buf));

  return processPdfDocument(doc, mode);
}

function processPdfDocument(doc: MuPdf.DocumentHandle, mode: ConversionMode) {
  if (!pdf) {
    throw new Error("MuPDF is not ready");
  }

  console.log("Processing...");
  const t0 = performance.now();
  const count = pdf.countPages(doc);
  const res = [];

  for (let i = 1; i <= count; i++) {
    res.push(processPdfPage(doc, i, mode));
  }

  console.log(
    `Completed in.. ${((performance.now() - t0) / 1000).toPrecision(3)}s`
  );
  return res;
}

function processPdfPage(
  doc: MuPdf.DocumentHandle,
  page: number,
  mode: ConversionMode
) {
  if (!pdf) {
    throw new Error("MuPDF is not ready");
  }

  switch (mode) {
    case ConversionMode.HTML:
      return pdf.drawPageAsHTML(doc, page);
    case ConversionMode.SVG:
      return pdf.drawPageAsSVG(doc, page);
    case ConversionMode.PNG:
      return pdf.drawPageAsPNG(doc, page, 300);
  }
}
