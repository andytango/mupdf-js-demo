import React, { useState, useCallback } from "react";
import { isPdfFile, processFile } from "./pdf";
import { ConversionMode } from "./ConversionMode";

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

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;

      if (files && isPdfFile(files)) {
        setProcessorState({
          ...processorState,
          file: files[0],
          processing: true,
        });

        processFile(files[0], mode).then((output: string[]) =>
          setProcessorState({
            ...processorState,
            processing: false,
            file: files[0],
            error: "",
            output,
          })
        );
      } else if (files && files.length) {
        setProcessorState({
          ...processorState,
          processing: false,
          error: `${files[0].type} is not valid`,
        });
      }
    },
    [processorState, setProcessorState]
  );

  const handleModeChange = useCallback(
    (e) => {
      if (file) {
        setProcessorState({
          ...processorState,
          processing: true,
          output: [],
          mode: e.target.value,
        });
        processFile(file, mode).then((output: string[]) =>
          setProcessorState({
            ...processorState,
            processing: false,
            error: "",
            output,
          })
        );
      } else {
        setProcessorState({ ...processorState, mode: e.target.value });
      }
    },
    [processorState]
  );

  return (
    <>
      <div className="fixed inset-x-0 top-0 p-3 bg-white shadow-sm flex items-center justify-between z-10">
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
          <label className="mr-4 font">Output</label>
          <select
            className="appearance-none bg-gray-200  text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none"
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
        {renderOutput(processorState)}
      </div>
    </>
  );
}

function renderOutput({ output, mode }: ProcessorState) {
  if (!output.length) {
    return null;
  }

  if (mode === ConversionMode.PNG) {
    return output.map((page, key) => (
      <img {...{ key }} className="relative bg-white w-full mb-1" src={page} />
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

export default App;
