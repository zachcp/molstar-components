#!/usr/bin/env -S deno run --allow-net --allow-read

/**
 * Development server for molstar-components
 *
 * This server allows local development by:
 * 1. Serving static files from the project root
 * 2. Automatically rewriting import maps in docs/index.html to use local sources
 * 3. Setting proper MIME types for TypeScript modules
 *
 * Usage: deno task dev
 */

import { serveDir } from "jsr:@std/http@1.0.10/file-server";
import { contentType } from "jsr:@std/media-types@1.0.3";

const PORT = 8000;

console.log(`🚀 Development server starting on http://localhost:${PORT}`);
console.log(`📁 Serving files from: ${Deno.cwd()}`);
console.log(
  `🔧 Local development mode: Using bundled molstar-components.dev.js`,
);
console.log(`\n💡 Open http://localhost:${PORT}/docs/ to view the demo\n`);

Deno.serve({ port: PORT }, async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Log requests (helpful for debugging)
  console.log(`${req.method} ${pathname}`);

  // Special handling for docs/index.html - rewrite import map for local dev
  if (pathname === "/docs/" || pathname === "/docs/index.html") {
    try {
      const html = await Deno.readTextFile("docs/index.html");

      // Replace the JSR import with local bundled file
      const devHtml = html.replace(
        '"@zachcp/molstar-components": "https://esm.sh/jsr/@zachcp/molstar-components"',
        '"@zachcp/molstar-components": "/docs/molstar-components.dev.js"',
      );

      return new Response(devHtml, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "access-control-allow-origin": "*",
        },
      });
    } catch (error) {
      console.error("Error reading index.html:", error);
      return new Response("Error loading page", { status: 500 });
    }
  }

  // For all other files, use standard file server
  return serveDir(req, {
    fsRoot: ".",
    showDirListing: false,
    quiet: true,
  });
});
