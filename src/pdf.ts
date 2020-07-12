import { ConversionMode } from "./ConversionMode";

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
      type: "exec",
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
