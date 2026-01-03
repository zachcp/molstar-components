# Demo

This directory contains an interactive demo of the `@zachcp/molstar-components` package. This shows usage in HTML using import maps. Components can also be used as standard TSX components within JavaScript projects.

## Development

```bash
# From project root
deno task dev

# This will:
# 1. Bundle src/ to docs/molstar-components.dev.js
# 2. Start a file server on http://localhost:8000
# 3. Open http://localhost:8000/docs/index-dev.html
```

The `index-dev.html` file uses the locally bundled `molstar-components.dev.js` instead of JSR, enabling rapid development without needing to publish changes.

## Production

The `index.html` file uses import maps pointing to JSR packages via esm.sh, making it work on GitHub Pages without any build step.
