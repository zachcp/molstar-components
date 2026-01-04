#!/usr/bin/env -S deno run --allow-all

/// <reference lib="deno.ns" />

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
      plugins: [...denoPlugins({
        configPath,
      })],
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
      plugins: [...denoPlugins({
        configPath,
      })],
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
