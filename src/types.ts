// deno-lint-ignore-file no-explicit-any
// Shared type definitions for Molstar global objects

declare global {
  interface Window {
    molstar?: {
      Viewer: any;
      PluginExtensions?: {
        mvs?: {
          MVSData: any;
        };
      };
    };
  }
}

export {};
