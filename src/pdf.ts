import { MuPdf } from "mupdf-js";
import { ConversionMode } from "./ConversionMode";
import { SearchResult } from "./pdf-worker";

export function isPdfFile(files: FileList | null) {
  return files && files.length > 0 && files[0].type === "application/pdf";
}

const worker = new Worker("./pdf-worker.ts");

export function processFile(
  file: File | null,
  mode: ConversionMode
): Promise<string[]> {
  return new Promise((res) => {
    worker.postMessage({
      type: "convert",
      mode,
      file: file,
    });

    const handleMessage = (val: any) => {
      res(val.data as string[]);
      worker.removeEventListener("message", val);
    };
    worker.addEventListener("message", handleMessage);
  });
}

export function searchFile(
  file: File | null,
  searchQuery: string
): Promise<SearchResult[]> {
  return new Promise((res) => {
    worker.postMessage({
      type: "search",
      file: file,
      searchQuery,
    });

    const handleMessage = (val: any) => {
      res(val.data as SearchResult[]);
      worker.removeEventListener("message", val);
    };
    worker.addEventListener("message", handleMessage);
  });
}
