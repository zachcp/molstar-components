# Molstar Components

[![JSR](https://jsr.io/badges/@zachcp/molstar-components)](https://jsr.io/@zachcp/molstar-components)
[![JSR Score](https://jsr.io/badges/@zachcp/molstar-components/score)](https://jsr.io/@zachcp/molstar-components)

Preact components for integrating Molstar molecular viewer with interactive
Monaco editor support for MolViewSpec.

## Development

```bash
# Bundle and start development server
deno task dev

# Open http://localhost:8000/docs/index-dev.html
```

This bundles your local source files and serves them at
`docs/molstar-components.dev.js`, allowing you to test changes by refreshing the
browser.

## Publishing

```bash
# Lint and type check
deno lint
deno check

# Publish (or use git tags for CI)
deno publish
```

## License

MIT
