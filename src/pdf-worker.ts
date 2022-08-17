import initMuPdf, { MuPdf } from "mupdf-js";
import { ConversionMode } from "./ConversionMode";

const PNG_SEARCH_RESOLUTION = 72;
const PNG_RESOLUTION = 300;

self.addEventListener("message", handleMessage);

let muPdf: MuPdf.Instance | undefined;

initMuPdf().then((mupdf: MuPdf.Instance) => {
  muPdf = mupdf;
});

function handleMessage(e: MessageEvent) {
  if (e.data.type === "convert") {
    convertFile(e.data.file, e.data.mode).then((val: string[] | void) => {
      self.postMessage(val);
    });
  }

  if (e.data.type === "search") {
    searchFile(e.data.file, e.data.searchQuery).then((val) => {
      self.postMessage(val);
    });
  }
}

async function convertFile(file: File | null, mode: ConversionMode) {
  const doc = await loadPdf(file);
  return convertPdfDocument(doc, mode);
}

function convertPdfDocument(doc: MuPdf.DocumentHandle, mode: ConversionMode) {
  const pdf = getMuPdfInstance();
  console.log("Processing...");
  const t0 = performance.now();
  const count = pdf.countPages(doc);
  const res = [];

  for (let i = 1; i <= count; i++) {
    res.push(convertPdfPage(doc, i, mode));
  }

  logTimeDelta(t0);
  return res;
}

function convertPdfPage(
  doc: MuPdf.DocumentHandle,
  page: number,
  mode: ConversionMode
) {
  const pdf = getMuPdfInstance();

  switch (mode) {
    case ConversionMode.HTML:
      return pdf.drawPageAsHTML(doc, page);
    case ConversionMode.SVG:
      return pdf.drawPageAsSVG(doc, page);
    case ConversionMode.PNG:
      return pdf.drawPageAsPNG(doc, page, PNG_RESOLUTION);
  }
}

export type SearchResult = {
  page: number;
  results: MuPdf.Box[];
  pageWidth: number;
  pageHeight: number;
};

async function searchFile(file: File | null, searchQuery: string | undefined) {
  const pdf = getMuPdfInstance();
  if (!searchQuery) {
    throw new Error("Invalid search query");
  }

  const doc = await loadPdf(file);
  const t0 = performance.now();
  console.log(`Searching for ${searchQuery}...`);
  const pages = pdf.countPages(doc);

  const res = [] as SearchResult[];

  for (let page = 1; page <= pages; page++) {
    const results = pdf.searchPageText(doc, page, searchQuery, 100);
    const pageHeight = pdf.pageHeight(doc, page, PNG_SEARCH_RESOLUTION);
    const pageWidth = pdf.pageWidth(doc, page, PNG_SEARCH_RESOLUTION);

    res.push({ page, results, pageWidth, pageHeight });
  }

  logTimeDelta(t0);

  return res;
}

async function loadPdf(file: File | null): Promise<MuPdf.DocumentHandle> {
  const pdf = getMuPdfInstance();

  if (!file) {
    throw new Error("Invalid file");
  }

  const buf = await file.arrayBuffer();
  return pdf.load(new Uint8Array(buf));
}

function getMuPdfInstance() {
  if (!muPdf) {
    throw new Error("MuPDF is not ready");
  }

  return muPdf;
}

function logTimeDelta(t0: number) {
  console.log(
    `Completed in ${((performance.now() - t0) / 1000).toPrecision(3)}s`
  );
}
