# Demo

This directory contains an interactive demo of the `@zachcp/molstar-components` package. This shows usage in HTML using import maps. Components can also be used as standard TSX components within JavaScript projects.

## Development

```bash
# From project root, run the dev server
deno task dev

# Open http://localhost:8000/docs/
```

The dev server (`dev-server.ts`) automatically rewrites import maps to use local source files instead of published JSR packages, enabling rapid development without needing to publish changes.

## Production

The `index.html` file uses import maps pointing to JSR packages via esm.sh, making it work on GitHub Pages without any build step.
