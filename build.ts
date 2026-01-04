#!/usr/bin/env -S deno run --allow-all

/// <reference lib="deno.ns" />
// deno-lint-ignore-file no-explicit-any

/**
 * Custom build script using esbuild to handle Monaco Editor's CSS and font files
 */

import * as esbuild from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";
import { resolve } from "@std/path";

async function build() {
  console.log("Building library bundle...");

  const configPath = resolve(Deno.cwd(), "./deno.json");

  try {
    // Build the library bundle
    await esbuild.build({
      plugins: [
        ...denoPlugins({
          configPath,
        }),
      ] as any,
      entryPoints: ["./src/mod.ts"],
      outfile: "./docs/molstar-components.js",
      bundle: true,
      format: "esm",
      platform: "browser",
      minify: true,
      target: "es2022",
      jsx: "automatic",
      jsxImportSource: "preact",
      loader: {
        ".ttf": "file",
        ".woff": "file",
        ".woff2": "file",
        ".eot": "file",
      },
      assetNames: "assets/[name]-[hash]",
      publicPath: "./",
    });

    console.log("✓ Library bundle created: docs/molstar-components.js");

    // Build the docs bundle
    console.log("\nBuilding docs bundle...");
    await esbuild.build({
      plugins: [
        ...denoPlugins({
          configPath,
        }),
      ] as any,
      entryPoints: ["./docs/index.ts"],
      outfile: "./docs/bundle.js",
      bundle: true,
      format: "esm",
      platform: "browser",
      minify: true,
      target: "es2022",
      jsx: "automatic",
      jsxImportSource: "preact",
      loader: {
        ".ttf": "file",
        ".woff": "file",
        ".woff2": "file",
        ".eot": "file",
      },
      assetNames: "assets/[name]-[hash]",
      publicPath: "./",
    });

    console.log("✓ Docs bundle created: docs/bundle.js");

    // Build Monaco editor workers
    console.log("\nBuilding Monaco editor workers...");

    const workerConfig = {
      plugins: [
        ...denoPlugins({
          configPath,
        }),
      ] as any,
      bundle: true,
      format: "iife" as const,
      platform: "browser" as const,
      target: "es2022",
      minify: true,
      loader: {
        ".ttf": "file",
        ".woff": "file",
        ".woff2": "file",
        ".eot": "file",
      } as any,
    };

    // Base editor worker
    await esbuild.build({
      ...workerConfig,
      entryPoints: {
        "editor.worker": "monaco-editor/workers/editor",
      },
      outdir: "./docs",
    });
    console.log("  ✓ editor.worker.js");

    // TypeScript/JavaScript worker
    await esbuild.build({
      ...workerConfig,
      entryPoints: {
        "ts.worker": "monaco-editor/workers/typescript",
      },
      outdir: "./docs",
    });
    console.log("  ✓ ts.worker.js");

    console.log("✓ Monaco workers built successfully");
  } catch (error) {
    console.error("Build failed:", error);
    Deno.exit(1);
  } finally {
    esbuild.stop();
  }
}

if (import.meta.main) {
  await build();
}
