/// <reference types="bun-types" />

// Force-load bun's type declarations for editors/LSPs that don't follow the
// transitive @types/bun → bun-types dependency. `bun:test` and other Bun
// built-in modules are declared in `bun-types`. tsc auto-discovers these
// via `@types/bun`; some editor language servers do not, so we explicitly
// reference them here once for the whole `src/` tree.
