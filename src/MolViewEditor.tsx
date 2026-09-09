// deno-lint-ignore-file no-explicit-any
import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { MVSTypes } from "./utils/monaco/mvs-types.ts";
import { setupMonacoCodeCompletion, clearMonacoEditHistory } from "./utils/monaco/monaco-utils.ts";
import * as monaco from "monaco-editor";

// Import TypeScript language defaults directly from contribution module
import * as typescriptModule from "monaco-editor/language/typescript/monaco.contribution.js";

// Import JavaScript syntax highlighting
import { conf, language } from "monaco-editor/languages/definitions/javascript/javascript.js";

import type { PluginUIContext } from 'molstar/lib/mol-plugin-ui/context';
import { UIBuilderProvider } from './state-builder-ui/provider.tsx';
import { SelectorHelper } from './state-builder-ui/helpers/SelectorHelper.tsx';
import { ColorHelper } from './state-builder-ui/helpers/ColorHelper.tsx';
import { TransformHelper } from './state-builder-ui/helpers/TransformHelper.tsx';
import { CameraHelper } from './state-builder-ui/helpers/CameraHelper.tsx';
import type { UINode } from './state-builder/index.ts';
import {
  detectMethodAtCursor,
  parseParamsText,
  injectNodeParams,
  HYBRID_HELPER_METHODS,
} from './utils/monaco/hybrid-editor-utils.ts';

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
   * Controlled value. When provided, overrides editor content imperatively.
   * Use this to push code into the editor from outside (e.g. from a builder).
   * Unlike `initialCode`, changes to this prop update the editor after mount.
   */
  value?: string;
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
  /**
   * Additional Monaco editor options to customize editor behavior.
   * These options are merged with the default options, allowing overrides.
   * @defaultValue undefined
   */
  editorOptions?: monaco.editor.IStandaloneEditorConstructionOptions;
  /**
   * Story-level JavaScript code injected into Monaco's IntelliSense scope.
   * Use this for helper function definitions shared across scenes so
   * autocomplete works for those helpers inside scene code.
   */
  commonCode?: string;
  /**
   * CSS class applied to the editor container div.
   * When provided, `height` is ignored — sizing is fully controlled by the class
   * (e.g. `"absolute inset-0"` to fill a relative parent).
   */
  className?: string;
  /**
   * Called after the Monaco editor is created and ready.
   * Use this to register custom actions, context menu items, or keybindings.
   * @param editor - The Monaco standalone editor instance
   */
  onEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  /**
   * When true, enables right-click context menu helpers for builder methods.
   * Right-clicking inside `.component()`, `.color()`, `.transform()`, or `.camera()`
   * opens the corresponding visual helper dialog pre-populated with the current params.
   * The result is injected back into the code when the user clicks Apply.
   * @defaultValue false
   */
  hybridMode?: boolean;
  /**
   * Molstar plugin instance, used by helpers to read structure metadata
   * (chain/residue info for the SelectorHelper) and camera position.
   * Only relevant when `hybridMode` is true.
   */
  plugin?: PluginUIContext | null;
  /**
   * Current camera snapshot from the viewer, forwarded to CameraHelper's
   * "Capture from Viewer" button. Only relevant when `hybridMode` is true.
   */
  cameraSnapshot?: unknown;
  /**
   * TypeScript diagnostic error codes to suppress in this editor.
   * Use `[2451]` when multiple independent editors share one page to suppress
   * cross-editor "Cannot redeclare block-scoped variable" false positives.
   * @defaultValue []
   */
  diagnosticCodesToIgnore?: number[];
}

// Counter to generate unique URIs for Monaco models
// This prevents "ModelService: Cannot add model because it already exists!" errors
// when multiple editors are created on the same page
let editorCounter = 0;

/**
 * Build a minimal UINode from a detected method name and raw params text.
 * Used to pre-populate helper dialogs in hybrid mode.
 */
function buildHybridNode(methodName: string, paramsText: string): UINode {
  const kind = HYBRID_HELPER_METHODS[methodName] ?? methodName;
  return { id: `hybrid-${methodName}`, kind: kind as any, params: parseParamsText(paramsText), children: [] };
}

/**
 * MolViewEditor component for editing Mol* View Stories code.
 *
 * This component provides a Monaco-based code editor with syntax highlighting,
 * autocompletion for MVS (Mol* View Stories) types, and keyboard shortcuts.
 * It provides intelligent code completion for building molecular visualizations.
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
 * - Press Ctrl/Cmd+S (also Alt+S, Cmd/Ctrl+Enter, Alt+Enter) to trigger the save callback
 * - The editor defaults to dark theme; pass `editorOptions={{ theme: 'vs' }}` for light theme
 * - Autocompletion for MVS types is automatically configured
 *
 * ## Monaco worker setup (required in bundled apps)
 *
 * TypeScript IntelliSense (hover info, completions) requires Monaco's TypeScript language
 * service worker. `MolViewEditor` defaults to no-op workers so it mounts without errors in
 * any environment, but **you must configure real workers** to get full IntelliSense.
 *
 * Set `window.MonacoEnvironment` **before** this component mounts (e.g. at module top-level
 * in the file that imports `MolViewEditor`). The exact setup depends on your bundler:
 *
 * **webpack 5 / Next.js** — bundle workers from the local `monaco-editor` package:
 * ```ts
 * if (typeof window !== 'undefined' && !window.MonacoEnvironment) {
 *   window.MonacoEnvironment = {
 *     getWorker(_moduleId: string, label: string): Worker {
 *       if (label === 'typescript' || label === 'javascript') {
 *         return new Worker(
 *           new URL('monaco-editor/esm/vs/language/typescript/ts.worker', import.meta.url)
 *         );
 *       }
 *       return new Worker(
 *         new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url)
 *       );
 *     },
 *   };
 * }
 * ```
 *
 * **Vite** — same `new URL(...)` pattern works; Vite handles worker bundling automatically.
 *
 * If `window.MonacoEnvironment` is already set (e.g. by `@monaco-editor/react`'s CDN loader),
 * `MolViewEditor` will use that setup and you don't need to do anything.
 *
 * @param props - Component props
 * @returns A React component displaying the Monaco code editor
 */
export function MolViewEditor({
  initialCode = '',
  value,
  onCodeChange,
  onSave,
  height = "400px",
  editorOptions,
  commonCode,
  className,
  onEditorMount,
  hybridMode = false,
  plugin,
  cameraSnapshot,
  diagnosticCodesToIgnore = [],
}: MolViewEditorProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  // Hybrid mode state — only active when hybridMode prop is true
  const [hybridHelper, setHybridHelper] = useState<{
    methodName: string;
    node: UINode;
    paramsRange: monaco.Range;
  } | null>(null);

  // Keep refs to callbacks so the editor is never recreated when they change.
  // Inline arrow functions passed as props would otherwise cause teardown/remount
  // on every parent render, producing Monaco CancellationErrors during dispose.
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  const onCodeChangeRef = useRef(onCodeChange);
  useEffect(() => { onCodeChangeRef.current = onCodeChange; }, [onCodeChange]);
  const onEditorMountRef = useRef(onEditorMount);
  useEffect(() => { onEditorMountRef.current = onEditorMount; }, [onEditorMount]);

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

    // Configure Monaco worker environment if not already provided by the host.
    // Default: no-op blob workers so the component works in any environment
    // without requiring worker files on a specific path. Consumers who want
    // real background worker processing should set window.MonacoEnvironment
    // (with getWorkerUrl or getWorker) before mounting MolViewEditor.
    if (!(window as any).MonacoEnvironment) {
      (window as any).MonacoEnvironment = {
        getWorkerUrl: function (_moduleId: string, _label: string): string {
          const blob = new Blob(["self.onmessage = () => {};"], {
            type: "application/javascript",
          });
          return URL.createObjectURL(blob);
        },
      };
    }

    // Monaco 0.55.x bug: caretPositionFromPoint() (Firefox) or caretRangeFromPoint()
    // (Chrome) returns null when dragging to select past the last line into empty
    // editor space. Monaco's _doHitTestWithCaretPositionFromPoint doesn't null-check
    // the result, throwing inside DragScrollingOperation. Selection continues to work.
    // preventDefault() alone isn't enough — dev error overlays (e.g. Next.js) add
    // their own listeners that still fire. We register in the capture phase and call
    // stopImmediatePropagation() so the event never reaches those handlers.
    // Related: https://github.com/microsoft/monaco-editor/issues/4379
    const suppressHitTestError = (e: ErrorEvent) => {
      if (e.message?.includes("hitResult is null") || e.message?.includes("offsetNode")) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    globalThis.addEventListener("error", suppressHitTestError, { capture: true });
    return () => globalThis.removeEventListener("error", suppressHitTestError, { capture: true });
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
      setupMonacoCodeCompletion(monacoWithTypescript as any, MVSTypes, commonCode, diagnosticCodesToIgnore);

      // Create Monaco editor model with explicit JavaScript language and unique URI
      // Each editor instance gets a unique URI to prevent model conflicts
      const uniqueUri = `file:///main-${++editorCounter}.js`;
      const model = monaco.editor.createModel(
        initialCode,
        "javascript",
        monaco.Uri.parse(uniqueUri),
      );

      // Create Monaco editor with default options and user overrides
      const editor = monaco.editor.create(containerRef.current!, {
        model: model,
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        wordWrap: "on",
        glyphMargin: false,
        folding: false,
        lineNumbersMinChars: 2,
        renderValidationDecorations: "on",
        showUnused: true,
        fixedOverflowWidgets: true,
        ...editorOptions,
      });

      editorRef.current = editor;

      // Save shortcuts: Cmd/Ctrl+S, Alt+S, Cmd/Ctrl+Enter, Alt+Enter
      const triggerSave = () => { if (onSaveRef.current) onSaveRef.current(editor.getValue()); };
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, triggerSave);
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyS, triggerSave);
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, triggerSave);
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Enter, triggerSave);

      // Handle content changes
      editor.onDidChangeModelContent(() => {
        if (onCodeChangeRef.current) {
          onCodeChangeRef.current(editor.getValue());
        }
      });

      setIsReady(true);
      if (onEditorMountRef.current) {
        onEditorMountRef.current(editor);
      }

      if (hybridMode) {
        // One context key per method — drives smart menu visibility
        const ctxKeys: Record<string, monaco.editor.IContextKey<boolean>> = {};
        for (const method of Object.keys(HYBRID_HELPER_METHODS)) {
          ctxKeys[method] = editor.createContextKey<boolean>(`inHybrid_${method}_${editorCounter}`, false);
        }

        // Update context keys on every cursor move
        editor.onDidChangeCursorPosition(() => {
          const model = editor.getModel();
          const pos = editor.getPosition();
          const detected = (model && pos) ? detectMethodAtCursor(model, pos) : null;
          for (const method of Object.keys(HYBRID_HELPER_METHODS)) {
            ctxKeys[method].set(detected?.methodName === method);
          }
        });

        const HELPER_LABELS: Record<string, string> = {
          component: 'Edit Selector with Helper…',
          color:     'Pick Color with Helper…',
          transform: 'Edit Transform with Helper…',
          camera:    'Edit Camera with Helper…',
        };

        for (const [method, label] of Object.entries(HELPER_LABELS)) {
          editor.addAction({
            id: `hybrid-${method}-${editorCounter}`,
            label,
            contextMenuGroupId: 'mvs-helpers',
            contextMenuOrder: Object.keys(HELPER_LABELS).indexOf(method),
            precondition: `inHybrid_${method}_${editorCounter}`,
            run: (ed) => {
              const model = ed.getModel();
              const pos = ed.getPosition();
              if (!model || !pos) return;
              const ctx = detectMethodAtCursor(model, pos);
              if (!ctx || ctx.methodName !== method) return;
              const node = buildHybridNode(ctx.methodName, ctx.paramsText);
              setHybridHelper({ methodName: ctx.methodName, node, paramsRange: ctx.paramsRange });
            },
          });
        }
      }
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
  }, [hybridMode]); // hybridMode affects Monaco action registration

  // Update editor value when initialCode prop changes
  useEffect(() => {
    if (editorRef.current && isReady) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== initialCode) {
        editorRef.current.setValue(initialCode);
      }
    }
  }, [initialCode, isReady]);

  // Update editor content when controlled `value` prop changes externally.
  // Only fires when value is defined (opt-in controlled mode).
  useEffect(() => {
    if (editorRef.current && isReady && value !== undefined) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== value) {
        editorRef.current.setValue(value);
        clearMonacoEditHistory(editorRef.current).catch(() => {});
      }
    }
  }, [value, isReady]);

  // Re-apply commonCode to IntelliSense when it changes.
  // On initial mount this fires once after setIsReady(true) — a harmless redundant
  // re-registration since setupMonacoCodeCompletion already added it. On subsequent
  // changes it overwrites the previous entry (addExtraLib with same path is idempotent).
  useEffect(() => {
    if (!isReady) return;
    const monacoWithTypescript = {
      ...monaco,
      languages: {
        ...monaco.languages,
        typescript: typescriptModule,
      },
    };
    if (commonCode) {
      (monacoWithTypescript as any).languages.typescript.javascriptDefaults.addExtraLib(
        commonCode,
        'js:common-code.js',
      );
    }
  }, [commonCode, isReady]);

  return (
    <>
      <div
        ref={containerRef}
        className={className}
        style={className ? undefined : { width: "100%", height, border: "1px solid #333" }}
      />
      {hybridMode && hybridHelper && (
        <UIBuilderProvider plugin={plugin} cameraSnapshot={cameraSnapshot}>
          {(() => {
            const onUpdate = (updates: Partial<UINode>) => {
              if (!editorRef.current) return;
              const params = updates.params ?? hybridHelper.node.params;
              const injected = updates.custom != null ? { ...params, custom: updates.custom } : params;
              injectNodeParams(editorRef.current, hybridHelper.paramsRange, injected);
              setHybridHelper(null);
            };
            const onOpenChange = (open: boolean) => { if (!open) setHybridHelper(null); };
            const node = hybridHelper.node;

            if (hybridHelper.methodName === 'component') {
              return <SelectorHelper node={node} onUpdate={onUpdate} open onOpenChange={onOpenChange} />;
            }
            if (hybridHelper.methodName === 'color') {
              return <ColorHelper node={node} onUpdate={onUpdate} open onOpenChange={onOpenChange} />;
            }
            if (hybridHelper.methodName === 'transform') {
              return <TransformHelper node={node} onUpdate={onUpdate} open onOpenChange={onOpenChange} />;
            }
            if (hybridHelper.methodName === 'camera') {
              return <CameraHelper node={node} onUpdate={onUpdate} open onOpenChange={onOpenChange} />;
            }
            return null;
          })()}
        </UIBuilderProvider>
      )}
    </>
  );
}
