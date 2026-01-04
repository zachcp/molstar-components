# Demo

This directory contains an interactive demo of the `@zachcp/molstar-components` package.

## Development

```bash
# From project root - builds and serves
deno task dev

# Open http://localhost:8000/docs/
```

This builds both the library (`molstar-components.js`) and the demo app (`bundle.js` from `index.ts`) using esbuild, then starts a file server.

## Production

On release (git tag), the CI workflow:
1. Runs `deno task build` to create both bundles
2. Uploads the `docs/` directory as a GitHub Pages artifact
3. Deploys to GitHub Pages
4. Publishes to JSR

The `index.html` file loads the built JavaScript, making it work on GitHub Pages.
