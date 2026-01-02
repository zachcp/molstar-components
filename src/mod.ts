/**
 * Molstar Components - Preact components for molecular visualization
 *
 * This package provides ready-to-use Preact components for integrating the Molstar
 * molecular viewer into your web applications. It includes components for displaying
 * molecular structures, editing Mol* View Stories code, and combining both in an
 * interactive development environment.
 *
 * ## Features
 *
 * - **MolstarViewer**: Display molecular structures from MVS (Mol* View State) data
 * - **MolViewEditor**: Monaco-based code editor with MVS syntax highlighting and autocompletion
 * - **EditorWithViewer**: Integrated editor and viewer with live code execution
 *
 * ## Installation
 *
 * ```bash
 * # Using JSR
 * deno add @zachcp/molstar-components
 *
 * # Using npm
 * npx jsr add @zachcp/molstar-components
 * ```
 *
 * ## Usage
 *
 * ```tsx
 * import { MolstarViewer, EditorWithViewer } from "@zachcp/molstar-components";
 *
 * // Display a molecular structure
 * function App() {
 *   return (
 *     <MolstarViewer
 *       mvsData={myMolecularData}
 *       config={{ layoutShowControls: true }}
 *       style={{ height: "600px" }}
 *     />
 *   );
 * }
 *
 * // Interactive editor with live preview
 * function EditorApp() {
 *   return (
 *     <EditorWithViewer
 *       initialCode={`
 *         const structure = builder
 *           .download({ url: 'https://www.ebi.ac.uk/pdbe/entry-files/1cbs.bcif' })
 *           .parse({ format: 'bcif' })
 *           .modelStructure();
 *
 *         structure
 *           .component({ selector: 'polymer' })
 *           .representation({ type: 'cartoon' })
 *           .color({ color: 'blue' });
 *       `}
 *       autoRun={true}
 *       layout="horizontal"
 *     />
 *   );
 * }
 * ```
 *
 * ## Requirements
 *
 * - Molstar viewer library (loaded from CDN or bundled)
 * - Monaco editor (for code editing features)
 * - Modern browser with ES2022 support
 *
 * @module
 */

export { MolstarViewer } from "./MolstarViewer.tsx";
export type {
  MolstarViewerConfig,
  MolstarViewerProps,
  MVSLoadOptions,
} from "./MolstarViewer.tsx";

export { MolViewEditor } from "./MolViewEditor.tsx";
export type { MolViewEditorProps } from "./MolViewEditor.tsx";

export { EditorWithViewer } from "./EditorWithViewer.tsx";
export type { EditorWithViewerProps } from "./EditorWithViewer.tsx";
