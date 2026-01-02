// deno-lint-ignore-file no-explicit-any no-window
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import "./types.ts";

export interface MolstarViewerConfig {
  layoutIsExpanded?: boolean;
  layoutShowControls?: boolean;
  layoutShowRemoteState?: boolean;
  layoutShowSequence?: boolean;
  layoutShowLog?: boolean;
  layoutShowLeftPanel?: boolean;
  viewportShowExpand?: boolean;
  viewportShowSelectionMode?: boolean;
  viewportShowAnimation?: boolean;
  [key: string]: any;
}

export interface MVSLoadOptions {
  appendSnapshots?: boolean;
  keepCamera?: boolean;
}

export interface MolstarViewerProps {
  /**
   * Molstar MVS data as JSON object
   */
  mvsData: any;

  /**
   * Viewer configuration options
   */
  config?: MolstarViewerConfig;

  /**
   * MVS loading options
   */
  loadOptions?: MVSLoadOptions;

  /**
   * Container style
   */
  style?: JSX.CSSProperties;

  /**
   * Container class name
   */
  className?: string;

  /**
   * Callback when viewer is initialized
   */
  onViewerInit?: (viewer: any) => void;

  /**
   * Callback when MVS data is loaded
   */
  onMVSLoaded?: (viewer: any) => void;

  /**
   * Callback when an error occurs
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
        if (!window.molstar?.Viewer) {
          await new Promise<void>((resolve, reject) => {
            const checkMolstar = setInterval(() => {
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
        if (!window.molstar) {
          throw new Error("Molstar not available");
        }

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
