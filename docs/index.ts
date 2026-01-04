// Entry point for docs demo
import { h, render } from "preact";
import { EditorWithViewer, MolstarViewer } from "../src/mod.ts";
import { exampleMVSData, defaultCode } from "./demo-data.js";

// Initialize when DOM is ready
window.addEventListener("load", async () => {
  try {
    // Render simple viewer using MolstarViewer component
    const viewerContainer = document.getElementById("viewer-container");
    if (viewerContainer) {
      render(
        h(MolstarViewer, {
          mvsData: exampleMVSData,
          config: {
            layoutIsExpanded: false,
            layoutShowControls: false,
            layoutShowSequence: false,
            layoutShowLog: false,
            layoutShowLeftPanel: false,
          },
          style: { height: "100%", width: "100%" },
        }),
        viewerContainer,
      );
    }

    // Render EditorWithViewer component
    const editorViewerContainer = document.getElementById(
      "editor-viewer-container",
    );
    if (editorViewerContainer) {
      render(
        h(EditorWithViewer, {
          initialCode: defaultCode,
          layout: "horizontal",
          editorHeight: "600px",
          viewerHeight: "600px",
          autoRun: true,
          autoRunDelay: 500,
        }),
        editorViewerContainer,
      );
    }
  } catch (error) {
    console.error("Error rendering components:", error);
  }
});
