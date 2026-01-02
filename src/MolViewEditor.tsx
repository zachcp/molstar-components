// deno-lint-ignore-file no-explicit-any
import { h } from "preact";
import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { setupMonacoCodeCompletion, MVSTypes } from "@molstar/mol-view-stories";

export interface MolViewEditorProps {
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  onSave?: (code: string) => void;
  height?: string;
}

// Monaco types
interface MonacoWindow {
  monaco?: any;
}

const DEFAULT_CODE = `const structure = builder
  .download({ url: 'https://www.ebi.ac.uk/pdbe/entry-files/1cbs.bcif' })
  .parse({ format: 'bcif' })
  .modelStructure();

structure
  .component({ selector: 'polymer' })
  .representation({ type: 'cartoon' })
  .color({ color: 'green' });`;

export function MolViewEditor({
  initialCode = DEFAULT_CODE,
  onCodeChange,
  onSave,
  height = "400px",
}: MolViewEditorProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Handler to prevent Cmd+S from triggering browser save or other actions
    // Only fires when the editor container has focus
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        // Check if the event target is within the editor container
        if (
          containerRef.current &&
          containerRef.current.contains(e.target as Node)
        ) {
          e.preventDefault();
          e.stopPropagation();
          if (onSave && editorRef.current) {
            onSave(editorRef.current.getValue());
          }
        }
      }
    };

    // Wait for Monaco to be available
    const initEditor = () => {
      const win = window as unknown as MonacoWindow;
      if (!win.monaco) {
        setTimeout(initEditor, 100);
        return;
      }

      // Create Monaco editor
      const editor = win.monaco.editor.create(containerRef.current, {
        value: initialCode,
        language: "javascript",
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        wordWrap: "on",
      });

      editorRef.current = editor;

      // Setup Monaco code completion with MVS types
      setupMonacoCodeCompletion(win.monaco, MVSTypes);

      // Add keyboard shortcuts for save
      editor.addCommand(
        win.monaco.KeyMod.CtrlCmd | win.monaco.KeyCode.KeyS,
        () => {
          if (onSave) {
            onSave(editor.getValue());
          }
        },
      );

      // Handle content changes
      editor.onDidChangeModelContent(() => {
        if (onCodeChange) {
          onCodeChange(editor.getValue());
        }
      });

      setIsReady(true);
    };

    // Add global event listener
    document.addEventListener("keydown", handleKeyDown, true);

    initEditor();

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, [onSave]);

  // Update editor value when initialCode prop changes
  useEffect(() => {
    if (editorRef.current && isReady) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== initialCode) {
        editorRef.current.setValue(initialCode);
      }
    }
  }, [initialCode, isReady]);

  return h("div", {
    ref: containerRef,
    style: { width: "100%", height, border: "1px solid #333" },
  });
}
