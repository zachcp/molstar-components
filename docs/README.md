# Demo

This directory contains an interactive demo of the `@zachcp/molstar-components` package.

## Development

```bash
# From project root - bundles and serves
deno task dev

# Open http://localhost:8000/docs/
```

This bundles both the library (`molstar-components.js`) and the demo app (`bundle.js` from `index.ts`), then starts a file server.

## Production

On release (git tag), the CI workflow:
1. Runs `deno task bundle` to create both bundles
2. Uploads the `docs/` directory as a GitHub Pages artifact
3. Deploys to GitHub Pages
4. Publishes to JSR

The `index.html` file loads the bundled JavaScript, making it work on GitHub Pages.
