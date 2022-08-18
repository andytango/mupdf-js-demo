import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { isPdfFile, processFile, searchFile } from "./pdf";
import { ConversionMode } from "./ConversionMode";
import { MuPdf } from "mupdf-js";
import { SearchResult } from "./pdf-worker";

const initialState = {
  processing: false,
  file: null as File | null,
  mode: ConversionMode.PNG,
  error: "",
  output: [] as string[],
};

type ProcessorState = typeof initialState;

function App() {
  const [processorState, setProcessorState] = useState(initialState);
  const { processing, mode, error, file } = processorState;
  const fileRef = useRef<File | null>(null);
  const searchTimeoutRef = useRef(-1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([] as SearchResult[]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      const { mode } = processorState;

      if (files && isPdfFile(files)) {
        setProcessorState({
          ...processorState,
          file: files[0],
          processing: true,
        });

        setSearchQuery("");

        processFile(files[0], mode).then((output: string[]) => {
          fileRef.current = files[0];
          return setProcessorState({
            ...processorState,
            processing: false,
            file: files[0],
            error: "",
            output,
          });
        });
      } else if (files && files.length) {
        setProcessorState({
          ...processorState,
          processing: false,
          error: `${files[0].type} is not valid`,
        });
      }
    },
    [processorState, setProcessorState, setSearchQuery]
  );

  const handleSearchQueryChange = useCallback(
    (e) => setSearchQuery(e.target.value),
    [setSearchQuery]
  );

  useEffect(() => {
    clearTimeout(searchTimeoutRef.current);

    if (searchQuery) {
      searchTimeoutRef.current = window.setTimeout(async () => {
        setSearching(true);
        const results = await searchFile(fileRef.current, searchQuery);
        setSearching(false);
        setSearchResults(results);
      }, 600);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchTimeoutRef, processorState]);

  const handleModeChange = useCallback(
    (e) => {
      const mode = e.target.value;

      if (file) {
        setProcessorState({
          ...processorState,
          processing: true,
          output: [],
          mode,
        });

        setSearchQuery("");

        processFile(file, mode).then((output: string[]) =>
          setProcessorState({
            ...processorState,
            processing: false,
            error: "",
            output,
            mode,
          })
        );
      } else {
        setProcessorState({ ...processorState, mode });
        setSearchQuery("");
      }
    },
    [processorState, setSearchQuery]
  );

  const numSearchResults = useMemo(
    () => searchResults.reduce((memo, next) => memo + next.results.length, 0),
    [searchResults]
  );

  return (
    <>
      <div className="fixed inset-x-0 top-0 p-3 bg-white shadow-sm flex items-center justify-between z-10 select-none">
        <div>
          <span className="mr-4 font-bold">MuPDF.js Demo</span>
        </div>
        <div>
          <input
            type="file"
            onChange={handleFileChange}
            disabled={processing}
          />
        </div>
        <div>
          <input
            className="appearance-none bg-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none"
            placeholder="Search..."
            type="text"
            value={searchQuery}
            onChange={handleSearchQueryChange}
          />
          <span className="pl-2">
            {searching && "Searching..."}
            {!searching &&
              numSearchResults > 0 &&
              `${numSearchResults} results`}
          </span>
        </div>
        <div>
          <label className="mr-4 font">Output</label>
          <select
            className="appearance-none bg-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none"
            onChange={handleModeChange}
            disabled={processing}
            value={processorState.mode}
          >
            <option value={ConversionMode.PNG}>PNG</option>
            <option value={ConversionMode.SVG}>SVG</option>
            <option value={ConversionMode.HTML}>HTML</option>
          </select>
        </div>
      </div>
      {processing && (
        <div className="fixed w-full h-full flex items-center justify-center z-20">
          <div className="absolute inset bg-gray-200 opacity-25"></div>
          <div className="p-4 bg-white rounded-md">
            {processing ? "Processing..." : error}
          </div>
        </div>
      )}
      <div className="m-auto z-0 container text-center pt-24">
        {renderOutput(processorState, searchResults)}
      </div>
    </>
  );
}

function renderOutput(
  processorState: ProcessorState,
  searchResults: SearchResult[]
) {
  const { output, mode } = processorState;

  if (!output.length) {
    return null;
  }

  if (mode === ConversionMode.PNG) {
    return output.map((page, key) => (
      <PngPage
        {...{ key }}
        page={page}
        pageNumber={key + 1}
        searchResults={searchResults.find(({ page }) => page === key + 1)}
      />
    ));
  }

  if (mode === ConversionMode.SVG) {
    return output.map((page, key) => (
      <div
        className="relative text-center inline-block bg-white m-auto mb-1"
        {...{ key }}
        dangerouslySetInnerHTML={{ __html: page }}
      />
    ));
  }

  return output.map((page, key) => (
    <div
      className="relative bg-white m-auto mb-1"
      {...{ key }}
      dangerouslySetInnerHTML={{ __html: page }}
    />
  ));
}

type PngPageProps = {
  page: string;
  pageNumber: number;
  searchResults?: SearchResult;
};

function PngPage({ page, pageNumber, searchResults }: PngPageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [boxes, setBoxes] = useState([] as MuPdf.Box[]);

  useEffect(() => {
    if (imgRef.current && searchResults) {
      const { width, height } = imgRef.current;
      const { pageWidth, pageHeight, results } = searchResults;
      setBoxes(
        results.map(
          (res) =>
            ({
              x: (res.x / pageWidth) * width,
              y: (res.y / pageHeight) * height,
              w: (res.w / pageWidth) * width,
              h: (res.h / pageHeight) * height,
            } as MuPdf.Box)
        )
      );
    }
  }, [searchResults]);

  if (boxes.length) {
    return (
      <div className="relative bg-white w-full mb-1">
        <img ref={imgRef} src={page} />
        <div className="absolute inset-0">
          {boxes.map(({ x, y, w, h }, key) => (
            <div
              {...{ key }}
              className="absolute bg-yellow-400 rounded-sm opacity-50"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${w}px`,
                height: `${h}px`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div key={pageNumber} className="relative bg-white w-full mb-1">
      <img ref={imgRef} src={page} />
    </div>
  );
}

export default App;
