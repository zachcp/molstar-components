// deno-lint-ignore-file no-explicit-any
import { h } from "preact";
import type { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { MVSTypes, setupMonacoCodeCompletion } from "@molstar/mol-view-stories";
import * as monaco from "monaco-editor";

// Import TypeScript language defaults directly from contribution module
import * as typescriptModule from "monaco-editor/typescript-contribution";

// Import JavaScript syntax highlighting
import { conf, language } from "monaco-editor/javascript-language";

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

// Counter to generate unique URIs for Monaco models
// This prevents "ModelService: Cannot add model because it already exists!" errors
// when multiple editors are created on the same page
let editorCounter = 0;

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

  // Configure Monaco environment once before first editor creation
  useEffect(() => {
    // Register JavaScript language
    try {
      monaco.languages.register({ id: "javascript" });
      monaco.languages.setMonarchTokensProvider("javascript", language as any);
      monaco.languages.setLanguageConfiguration("javascript", conf as any);
    } catch {
      // Language already registered, ignore
    }

    // Configure Monaco to use bundled workers
    if (!(window as any).MonacoEnvironment) {
      (window as any).MonacoEnvironment = {
        getWorkerUrl: function (_moduleId: string, label: string) {
          if (label === "typescript" || label === "javascript") {
            return "./ts.worker.js";
          }
          return "./editor.worker.js";
        },
      };
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Monaco editor
    const initEditor = () => {
      // Create adapter for setupMonacoCodeCompletion
      // Monaco 0.55.1 exports typescript module separately, need to inject it
      const monacoWithTypescript = {
        ...monaco,
        languages: {
          ...monaco.languages,
          typescript: typescriptModule,
        },
      };

      // Setup Monaco code completion with MVS types BEFORE creating editor
      // This configures compiler options, diagnostics, and adds type definitions
      setupMonacoCodeCompletion(monacoWithTypescript as any, MVSTypes);

      // Create Monaco editor model with explicit JavaScript language and unique URI
      // Each editor instance gets a unique URI to prevent model conflicts
      const uniqueUri = `file:///main-${++editorCounter}.js`;
      const model = monaco.editor.createModel(
        initialCode,
        "javascript",
        monaco.Uri.parse(uniqueUri),
      );

      // Create Monaco editor
      const editor = monaco.editor.create(containerRef.current!, {
        model: model,
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

      // Keyboard shortcut for save (Ctrl/Cmd+S)
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

    initEditor();

    return () => {
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        editorRef.current.dispose();
        editorRef.current = null;
        // Dispose the model to free memory and allow URI reuse
        if (model) {
          model.dispose();
        }
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
