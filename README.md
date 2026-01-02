# Molstar Components

Preact components for integrating Molstar molecular viewer with interactive
Monaco editor support for MolViewSpec.

## Features

- **MolstarViewer Component**: A Preact wrapper for the Molstar viewer with
  MolViewSpec (MVSJ) support
- **MolstarEditor Component**: Interactive Monaco editor that converts
  JavaScript to MolViewSpec JSON
- **CDN-based**: No direct Molstar dependency, accesses via
  `window.molstar.Viewer`
- **Static Assets**: Components compile to static JavaScript bundles

## Project Structure

```
molstar-components2/
├── src/
│   ├── MolstarViewer.tsx    # Basic Molstar viewer component
│   └── MolstarEditor.tsx    # Monaco editor + viewer component
├── docs/
│   ├── index.html           # Demo page with CDN links
│   ├── index.ts             # Demo app entry point
│   ├── bundle.js            # Built bundle (generated)
│   └── bundle.js.map        # Source map (generated)
├── build.ts                 # Build script using esbuild
└── deno.json                # Deno configuration
```

## Usage

### Build the Project

```bash
deno task build
```

This generates `docs/bundle.js` from `docs/index.ts`.

### Serve the Demo

```bash
deno task serve
```

Opens a file server at http://localhost:4507 (or similar port).

### Development

```bash
deno task dev
```

## Components

### MolstarViewer

A simple wrapper around the Molstar viewer that loads structures from
MolViewSpec JSON.

```tsx
import { MolstarViewer } from "./src/MolstarViewer.tsx";

<MolstarViewer
  mvsj={mvsjObject}
  layoutShowLog={false}
  layoutShowSequence={true}
  style={{ height: "600px" }}
  onViewerReady={(viewer) => console.log("Ready", viewer)}
/>;
```

**Props:**

- `mvsj`: MolViewSpec JSON object or string
- `layoutIsExpanded`: Boolean (default: true)
- `layoutShowControls`: Boolean (default: true)
- `layoutShowSequence`: Boolean (default: true)
- `layoutShowLog`: Boolean (default: false)
- `layoutShowLeftPanel`: Boolean (default: true)
- `viewportShowExpand`: Boolean (default: true)
- `viewportShowSelectionMode`: Boolean (default: false)
- `viewportShowAnimation`: Boolean (default: true)
- `className`: CSS class name
- `style`: Inline styles
- `onViewerReady`: Callback when viewer initializes

### MolstarEditor

Interactive Monaco editor that executes JavaScript code to generate MolViewSpec
JSON, automatically updating the viewer.

```tsx
import { MolstarEditor } from "./src/MolstarEditor.tsx";

<MolstarEditor
  initialCode={jsCode}
  autoRun={true}
  theme="vs-dark"
  editorHeight="300px"
  viewerHeight="500px"
  onMVSJGenerated={(mvsj) => console.log("Generated:", mvsj)}
/>;
```

**Props:**

- `initialCode`: Initial JavaScript code string
- `autoRun`: Auto-execute on code change (default: false)
- `theme`: Monaco theme ("vs-dark" or "vs-light")
- `editorHeight`: Editor container height
- `viewerHeight`: Viewer container height
- `viewerProps`: Props passed to MolstarViewer
- `onCodeChange`: Callback on code change
- `onMVSJGenerated`: Callback when MVSJ is generated
- `onError`: Callback on error

## MolViewSpec Format

The components expect MolViewSpec JSON format:

```json
{
  "root": {
    "kind": "root",
    "children": [
      {
        "kind": "structure",
        "params": {
          "url": "https://files.rcsb.org/download/1cbs.cif"
        },
        "children": [
          {
            "kind": "component",
            "params": { "selector": "polymer" },
            "children": [
              {
                "kind": "representation",
                "params": { "type": "cartoon" }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Requirements

- Deno 2.6.3+
- Modern browser with ES2020+ support

## License

MIT
