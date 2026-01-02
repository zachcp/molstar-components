// deno-lint-ignore-file no-explicit-any
import { h } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { StoryManager } from "@molstar/mol-view-stories";
import { MolViewEditor } from "./MolViewEditor.tsx";
import { MolstarViewer } from "./MolstarViewer.tsx";

export interface EditorWithViewerProps {
  initialCode?: string;
  layout?: "horizontal" | "vertical";
  editorHeight?: string;
  viewerHeight?: string;
  autoRun?: boolean;
  autoRunDelay?: number;
  hiddenCode?: string;
}

export function EditorWithViewer({
  initialCode,
  layout = "horizontal",
  editorHeight = "600px",
  viewerHeight = "600px",
  autoRun = false,
  autoRunDelay = 500,
  hiddenCode = "",
}: EditorWithViewerProps): h.JSX.Element {
  const [mvsData, setMvsData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentCode, setCurrentCode] = useState(initialCode || "");
  const debounceTimerRef = useRef<number | null>(null);

  const executeCode = useCallback(
    async (code: string) => {
      try {
        setError(null);

        const storyManager = new StoryManager();

        // Set global JavaScript code if provided
        if (hiddenCode) {
          storyManager.setGlobalJavascript(hiddenCode);
        }

        const sceneId = storyManager.addScene({
          javascript: code,
        });

        const scene = storyManager.getScene(sceneId);
        if (!scene) {
          throw new Error("Failed to retrieve scene");
        }

        const mvsDataResult = await storyManager.toMVS([scene]);

        if (!mvsDataResult) {
          throw new Error("Failed to generate valid MVS data");
        }

        setMvsData(mvsDataResult);
      } catch (err: any) {
        const errorMsg = err.message || "Error executing code";
        setError(errorMsg);
      }
    },
    [hiddenCode],
  );

  const handleSave = useCallback(
    (code: string) => {
      executeCode(code);
    },
    [executeCode],
  );

  const handleCodeChange = useCallback(
    (code: string) => {
      setCurrentCode(code);

      if (autoRun) {
        // Clear existing timer
        if (debounceTimerRef.current !== null) {
          clearTimeout(debounceTimerRef.current);
        }

        // Set new timer
        debounceTimerRef.current = setTimeout(() => {
          executeCode(code);
        }, autoRunDelay) as any;
      }
    },
    [autoRun, autoRunDelay, executeCode],
  );

  // Execute initial code on mount if autoRun is enabled
  useEffect(() => {
    if (autoRun && initialCode) {
      executeCode(initialCode);
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const containerStyle = {
    display: "flex",
    flexDirection: layout === "horizontal" ? "row" : "column",
    gap: "10px",
    height: layout === "horizontal" ? editorHeight : "auto",
  } as any;

  const editorContainerStyle = {
    flex: layout === "horizontal" ? "1" : "0 0 auto",
    minWidth: layout === "horizontal" ? "400px" : "auto",
  };

  const viewerContainerStyle = {
    flex: layout === "horizontal" ? "1" : "1",
    minWidth: layout === "horizontal" ? "400px" : "auto",
    minHeight: viewerHeight,
  };

  return h(
    "div",
    { style: containerStyle },
    h(
      "div",
      { style: editorContainerStyle },
      h(MolViewEditor, {
        initialCode: currentCode,
        onCodeChange: handleCodeChange,
        onSave: handleSave,
        height: editorHeight,
      }),
      error &&
        h(
          "div",
          {
            style: {
              padding: "10px",
              marginTop: "5px",
              backgroundColor: "#ff000020",
              color: "#ff0000",
              border: "1px solid #ff0000",
              fontFamily: "monospace",
              fontSize: "12px",
            },
          },
          `Error: ${error}`,
        ),
    ),
    h(
      "div",
      { style: viewerContainerStyle },
      mvsData
        ? h(MolstarViewer, {
            mvsData: mvsData,
            config: {
              layoutIsExpanded: false,
              layoutShowControls: false,
              layoutShowSequence: false,
              layoutShowLog: false,
              layoutShowLeftPanel: false,
            },
            style: { height: "100%", width: "100%" },
          })
        : h(
            "div",
            {
              style: {
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #333",
                color: "#666",
                backgroundColor: "#1e1e1e",
              },
            },
            autoRun
              ? "Start typing to see live updates..."
              : "Press Ctrl/Cmd+S to execute code",
          ),
    ),
  );
}
