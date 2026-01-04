// deno-lint-ignore-file no-explicit-any
import { h } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { StoryManager } from "@molstar/mol-view-stories";
import { MolViewEditor } from "./MolViewEditor.tsx";
import { MolstarViewer } from "./MolstarViewer.tsx";

/**
 * Log entry for execution history.
 */
export interface LogEntry {
  timestamp: Date;
  level: "info" | "error" | "success";
  message: string;
}

/**
 * Props for the EditorWithViewer component.
 */
export interface EditorWithViewerProps {
  /**
   * Initial code to display in the editor.
   * @defaultValue Empty string
   */
  initialCode?: string;
  /**
   * Layout orientation for the editor and viewer.
   * - "horizontal": Editor and viewer side-by-side
   * - "vertical": Editor above viewer
   * @defaultValue "horizontal"
   */
  layout?: "horizontal" | "vertical";
  /**
   * Height of the editor panel.
   * @defaultValue "600px"
   */
  editorHeight?: string;
  /**
   * Height of the viewer panel.
   * @defaultValue "600px"
   */
  viewerHeight?: string;
  /**
   * Whether to automatically execute code as the user types.
   * When enabled, code execution is debounced based on `autoRunDelay`.
   * @defaultValue true
   */
  autoRun?: boolean;
  /**
   * Delay in milliseconds before auto-executing code after the user stops typing.
   * Only applies when `autoRun` is true.
   * @defaultValue 500
   */
  autoRunDelay?: number;
  /**
   * Hidden JavaScript code that is always prepended to the user's code.
   * Useful for setting up global variables or functions.
   * @defaultValue Empty string
   */
  hiddenCode?: string;
  /**
   * Show the execution log panel below the editor.
   * @defaultValue true
   */
  showLog?: boolean;
  /**
   * Show the auto-update toggle checkbox.
   * @defaultValue true
   */
  showAutoUpdateToggle?: boolean;
}

/**
 * EditorWithViewer component combining a code editor and molecular viewer.
 *
 * This component provides an integrated development environment for creating
 * molecular visualizations using Mol* View Stories. It combines the MolViewEditor
 * for code editing with the MolstarViewer for real-time visualization.
 *
 * Features:
 * - Side-by-side or stacked layout
 * - Live code execution (auto-run mode) or manual execution (Ctrl/Cmd+S)
 * - Error display for debugging
 * - Hidden code execution for setup/utility functions
 * - Debounced auto-execution to reduce unnecessary renders
 *
 * @example
 * ```tsx
 * import { EditorWithViewer } from "@zachcp/molstar-components";
 *
 * function App() {
 *   const initialCode = `
 *     const structure = builder
 *       .download({ url: 'https://www.ebi.ac.uk/pdbe/entry-files/1cbs.bcif' })
 *       .parse({ format: 'bcif' })
 *       .modelStructure();
 *
 *     structure
 *       .component({ selector: 'polymer' })
 *       .representation({ type: 'cartoon' })
 *       .color({ color: 'blue' });
 *   `;
 *
 *   return (
 *     <EditorWithViewer
 *       initialCode={initialCode}
 *       layout="horizontal"
 *       autoRun={true}
 *       autoRunDelay={1000}
 *     />
 *   );
 * }
 * ```
 *
 * @remarks
 * - In manual mode, press Ctrl/Cmd+S to execute code
 * - In auto-run mode, code executes automatically after typing stops
 * - Errors are displayed below the editor
 * - The component uses StoryManager from @molstar/mol-view-stories
 *
 * @param props - Component props
 * @returns A Preact component with integrated editor and viewer
 */
export function EditorWithViewer({
  initialCode,
  layout = "horizontal",
  editorHeight = "600px",
  viewerHeight = "600px",
  autoRun = true,
  autoRunDelay = 500,
  hiddenCode = "",
  showLog = true,
  showAutoUpdateToggle = true,
}: EditorWithViewerProps): h.JSX.Element {
  const [mvsData, setMvsData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentCode, setCurrentCode] = useState(initialCode || "");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(autoRun);
  const [logExpanded, setLogExpanded] = useState(true);
  const debounceTimerRef = useRef<number | null>(null);

  const addLog = useCallback(
    (level: "info" | "error" | "success", message: string) => {
      setLogs((prev) => {
        const newLogs = [...prev, { timestamp: new Date(), level, message }];
        // Keep only last 100 entries to prevent memory issues
        return newLogs.slice(-100);
      });
    },
    [],
  );

  const executeCode = useCallback(
    async (code: string) => {
      const startTime = Date.now();

      try {
        setError(null);
        addLog("info", "Executing MVS code...");

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

        const duration = Date.now() - startTime;
        addLog("success", `Code executed successfully (${duration}ms)`);
        setMvsData(mvsDataResult);
      } catch (err: any) {
        const errorMsg = err.message || "Error executing code";
        addLog("error", errorMsg);
        setError(errorMsg);
      }
    },
    [hiddenCode, addLog],
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

      if (autoUpdateEnabled) {
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
    [autoUpdateEnabled, autoRunDelay, executeCode],
  );

  // Execute initial code on mount if autoRun is enabled
  useEffect(() => {
    if (autoRun && initialCode) {
      // Small delay to ensure StoryManager is ready
      const timer = setTimeout(() => {
        executeCode(initialCode);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoRun, initialCode, executeCode]);

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
      showAutoUpdateToggle &&
        h(
          "div",
          {
            style: {
              padding: "10px",
              backgroundColor: "#2a2a2a",
              borderTop: "1px solid #333",
            },
          },
          h(
            "label",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "14px",
              },
            },
            h("input", {
              type: "checkbox",
              checked: autoUpdateEnabled,
              onChange: (e: any) => setAutoUpdateEnabled(e.target.checked),
              style: { cursor: "pointer" },
            }),
            h(
              "span",
              null,
              "Auto-update (runs code automatically after typing)",
            ),
            !autoUpdateEnabled &&
              h(
                "span",
                {
                  style: {
                    marginLeft: "8px",
                    color: "#888",
                    fontSize: "12px",
                  },
                },
                "Press Ctrl/Cmd+S to execute",
              ),
          ),
        ),
      showLog &&
        logs.length > 0 &&
        h(
          "details",
          {
            open: logExpanded,
            onToggle: (e: any) => setLogExpanded(e.target.open),
            style: {
              marginTop: "5px",
              border: "1px solid #333",
              backgroundColor: "#1a1a1a",
            },
          },
          h(
            "summary",
            {
              style: {
                padding: "8px 10px",
                cursor: "pointer",
                userSelect: "none",
                fontSize: "14px",
              },
            },
            `Execution Log (${logs.length} ${logs.length === 1 ? "entry" : "entries"}) - Click to ${logExpanded ? "collapse" : "expand"}`,
          ),
          h(
            "div",
            {
              style: {
                maxHeight: "200px",
                overflowY: "auto",
                backgroundColor: "#0a0a0a",
                fontFamily: "monospace",
                fontSize: "12px",
              },
            },
            logs.map((log, idx) =>
              h(
                "div",
                {
                  key: idx,
                  style: {
                    padding: "4px 10px",
                    borderBottom: "1px solid #333",
                    color:
                      log.level === "error"
                        ? "#ff6b6b"
                        : log.level === "success"
                          ? "#51cf66"
                          : "#ccc",
                  },
                },
                h(
                  "span",
                  { style: { opacity: 0.6 } },
                  `[${log.timestamp.toLocaleTimeString()}]`,
                ),
                " ",
                log.message,
              ),
            ),
          ),
        ),
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
            autoUpdateEnabled
              ? "Start typing to see live updates..."
              : "Press Ctrl/Cmd+S to execute code",
          ),
    ),
  );
}
