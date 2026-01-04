// deno-lint-ignore-file no-explicit-any
import { h } from "preact";
import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { MVSTypes, setupMonacoCodeCompletion } from "@molstar/mol-view-stories";
import * as monaco from "monaco-editor";
import * as typescript from "monaco-editor/typescript";

/**
 * Props for the MolViewEditor component.
 */
export interface MolViewEditorProps {
  /**
   * Initial code to display in the editor.
   * @defaultValue Default MVS structure builder code
   */
  initialCode?: string;
  /**
   * Callback invoked when the editor content changes.
   * @param code - The current code in the editor
   */
  onCodeChange?: (code: string) => void;
  /**
   * Callback invoked when the user saves (Ctrl/Cmd+S).
   * @param code - The code to be saved
   */
  onSave?: (code: string) => void;
  /**
   * Height of the editor container.
   * @defaultValue "400px"
   */
  height?: string;
}

const DEFAULT_CODE = `const structure = builder
  .download({ url: 'https://www.ebi.ac.uk/pdbe/entry-files/1cbs.bcif' })
  .parse({ format: 'bcif' })
  .modelStructure();

structure
  .component({ selector: 'polymer' })
  .representation({ type: 'cartoon' })
  .color({ color: 'green' });`;

/**
 * MolViewEditor component for editing Mol* View Stories code.
 *
 * This component provides a Monaco-based code editor with syntax highlighting,
 * autocompletion for MVS (Mol* View Stories) types, and keyboard shortcuts.
 * It integrates with the @molstar/mol-view-stories library to provide
 * intelligent code completion for building molecular visualizations.
 *
 * The component expects the Monaco editor to be loaded from a CDN and available
 * on the global window object.
 *
 * @example
 * ```tsx
 * import { MolViewEditor } from "@zachcp/molstar-components";
 *
 * function App() {
 *   const handleSave = (code: string) => {
 *     console.log("Saved code:", code);
 *   };
 *
 *   return (
 *     <MolViewEditor
 *       initialCode="// Your MVS code here"
 *       onSave={handleSave}
 *       height="500px"
 *     />
 *   );
 * }
 * ```
 *
 * @remarks
 * - Press Ctrl/Cmd+S to trigger the save callback
 * - The editor features dark theme, line numbers, and word wrap
 * - Autocompletion for MVS types is automatically configured
 *
 * @param props - Component props
 * @returns A Preact component displaying the Monaco code editor
 */
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

    // Initialize Monaco editor
    const initEditor = () => {
      // Configure JavaScript compiler options for better diagnostics
      // Use javascriptDefaults (not typescriptDefaults) for JS language mode
      typescript.javascriptDefaults.setCompilerOptions({
        target: typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: typescript.ModuleResolutionKind.NodeJs,
        module: typescript.ModuleKind.ESNext,
        noEmit: true,
        esModuleInterop: true,
        disableSizeLimit: true,
        noErrorTruncation: true,
        jsx: typescript.JsxEmit.None,
        allowJs: true,
        checkJs: true,
        strict: false,
        noImplicitAny: false,
        strictNullChecks: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        skipLibCheck: true,
        typeRoots: [],
        lib: ["es2020"],
      });

      // Enable diagnostics
      typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        noSuggestionDiagnostics: false,
        diagnosticCodesToIgnore: [],
      });

      // Create Monaco editor
      const editor = monaco.editor.create(containerRef.current!, {
        value: initialCode,
        language: "javascript",
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        wordWrap: "on",
        glyphMargin: true,
        folding: true,
        renderValidationDecorations: "on",
        showUnused: true,
        fixedOverflowWidgets: true,
      });

      editorRef.current = editor;

      // Setup Monaco code completion with MVS types
      // Create adapter for Monaco 0.55.1's new API structure
      const monacoAdapter = {
        ...monaco,
        languages: {
          ...monaco.languages,
          typescript: typescript,
        },
      };
      setupMonacoCodeCompletion(monacoAdapter as any, MVSTypes);

      // Add keyboard shortcuts for save
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        if (onSave) {
          onSave(editor.getValue());
        }
      });

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
