// deno-lint-ignore-file no-explicit-any no-window
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";

/**
 * Configuration options for the Molstar viewer.
 * Controls the layout and visibility of various UI elements.
 */
export interface MolstarViewerConfig {
  /** Whether the layout is expanded */
  layoutIsExpanded?: boolean;
  /** Show control panel */
  layoutShowControls?: boolean;
  /** Show remote state controls */
  layoutShowRemoteState?: boolean;
  /** Show sequence viewer */
  layoutShowSequence?: boolean;
  /** Show log panel */
  layoutShowLog?: boolean;
  /** Show left side panel */
  layoutShowLeftPanel?: boolean;
  /** Show viewport expand button */
  viewportShowExpand?: boolean;
  /** Show selection mode controls */
  viewportShowSelectionMode?: boolean;
  /** Show animation controls */
  viewportShowAnimation?: boolean;
  /** Additional configuration options */
  [key: string]: any;
}

/**
 * Options for loading MVS (Mol* View State) data into the viewer.
 */
export interface MVSLoadOptions {
  /** Whether to append snapshots to existing data instead of replacing */
  appendSnapshots?: boolean;
  /** Whether to preserve the current camera position when loading */
  keepCamera?: boolean;
}

/**
 * Props for the MolstarViewer component.
 */
export interface MolstarViewerProps {
  /**
   * Molstar MVS (Mol* View State) data as JSON object.
   * This data defines the molecular structure and visualization state.
   */
  mvsData: any;

  /**
   * Viewer configuration options.
   * Controls UI elements and viewer behavior.
   * @defaultValue `{ layoutIsExpanded: false, layoutShowControls: false }`
   */
  config?: MolstarViewerConfig;

  /**
   * MVS loading options.
   * Controls how the MVS data is loaded into the viewer.
   * @defaultValue `{ appendSnapshots: false, keepCamera: false }`
   */
  loadOptions?: MVSLoadOptions;

  /**
   * Custom CSS styles for the viewer container.
   * @defaultValue `{ position: "relative", width: "100%", height: "500px" }`
   */
  style?: JSX.CSSProperties;

  /**
   * CSS class name for the viewer container.
   */
  className?: string;

  /**
   * Callback invoked when the viewer is initialized.
   * @param viewer - The initialized Molstar viewer instance
   */
  onViewerInit?: (viewer: any) => void;

  /**
   * Callback invoked when MVS data is successfully loaded.
   * @param viewer - The Molstar viewer instance with loaded data
   */
  onMVSLoaded?: (viewer: any) => void;

  /**
   * Callback invoked when an error occurs during initialization or loading.
   * @param error - The error that occurred
   */
  onError?: (error: Error) => void;
}

const defaultConfig: MolstarViewerConfig = {
  layoutIsExpanded: false,
  layoutShowControls: false,
};

const defaultLoadOptions: MVSLoadOptions = {
  appendSnapshots: false,
  keepCamera: false,
};

/**
 * MolstarViewer component for displaying molecular structures.
 *
 * This component integrates the Molstar viewer library to display molecular
 * structures from MVS (Mol* View State) data. It handles viewer initialization,
 * loading molecular data, and provides callbacks for key lifecycle events.
 *
 * The component expects the Molstar library to be loaded from a CDN and available
 * on the global window object. It will wait up to 10 seconds for the library to load.
 *
 * @example
 * ```tsx
 * import { MolstarViewer } from "@zachcp/molstar-components";
 *
 * function App() {
 *   const mvsData = {
 *     // Your MVS data here
 *   };
 *
 *   return (
 *     <MolstarViewer
 *       mvsData={mvsData}
 *       config={{ layoutShowControls: true }}
 *       onViewerInit={(viewer) => console.log("Viewer ready")}
 *       style={{ height: "600px" }}
 *     />
 *   );
 * }
 * ```
 *
 * @param props - Component props
 * @returns A Preact component displaying the Molstar viewer
 */
export function MolstarViewer({
  mvsData,
  config = {},
  loadOptions = {},
  style = {},
  className = "",
  onViewerInit,
  onMVSLoaded,
  onError,
}: MolstarViewerProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const defaultStyle: JSX.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "500px",
    ...style,
  };

  const mergedConfig = useMemo(
    () => ({ ...defaultConfig, ...config }),
    [JSON.stringify(config)],
  );
  const mergedLoadOptions = useMemo(
    () => ({ ...defaultLoadOptions, ...loadOptions }),
    [JSON.stringify(loadOptions)],
  );

  // Helper function to load MVS data
  const loadMVSDataHelper = async (viewer: any) => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const mvsString = JSON.stringify(mvsData);
      await viewer.loadMvsData(mvsString, "mvsj", mergedLoadOptions);

      if (onMVSLoaded) {
        onMVSLoaded(viewer);
      }
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize viewer
  useEffect(() => {
    if (!containerRef.current || isInitialized) return;

    const initViewer = async () => {
      try {
        // Wait for molstar to be available from CDN
        // @ts-ignore - molstar is loaded from CDN
        if (!window.molstar?.Viewer) {
          await new Promise<void>((resolve, reject) => {
            const checkMolstar = setInterval(() => {
              // @ts-ignore - molstar is loaded from CDN
              if (window.molstar?.Viewer) {
                clearInterval(checkMolstar);
                resolve();
              }
            }, 100);

            setTimeout(() => {
              clearInterval(checkMolstar);
              reject(new Error("Molstar failed to load from CDN"));
            }, 10000);
          });
        }
        // @ts-ignore - molstar is loaded from CDN
        if (!window.molstar) {
          throw new Error("Molstar not available");
        }

        // @ts-ignore - molstar is loaded from CDN
        const viewer = await window.molstar.Viewer.create(
          containerRef.current!,
          mergedConfig,
        );

        viewerRef.current = viewer;
        setIsInitialized(true);

        if (onViewerInit) {
          onViewerInit(viewer);
        }

        // Load MVS data immediately after initialization
        if (mvsData) {
          await loadMVSDataHelper(viewer);
        }
      } catch (error) {
        if (onError) {
          onError(error as Error);
        }
      }
    };

    initViewer();

    // Cleanup on unmount
    return () => {
      if (viewerRef.current) {
        try {
          viewerRef.current.dispose();
        } catch (_error) {
          // Silently handle disposal errors
        }
        viewerRef.current = null;
        setIsInitialized(false);
      }
    };
  }, []); // mergedConfig is memoized, only init once on mount

  // Load MVS data when it changes
  useEffect(() => {
    // Skip if not ready
    if (!isInitialized || !viewerRef.current || !mvsData) {
      return;
    }

    loadMVSDataHelper(viewerRef.current);
  }, [mvsData, isInitialized]);

  return (
    <div ref={containerRef} className={className} style={defaultStyle}>
      {!isInitialized && (
        <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
          Initializing viewer...
        </div>
      )}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "rgba(0,0,0,0.7)",
            color: "white",
            padding: "8px 16px",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        >
          Loading structure...
        </div>
      )}
    </div>
  );
}

export default MolstarViewer;
