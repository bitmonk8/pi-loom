# Changelog

2026-06-30 H1a — Project scaffold and toolchain: package.json deps/scripts/engines/type, tsconfig.json, Vitest runner, lint toolchain (eslint, @typescript-eslint/parser, loadable eslint-plugin-loom-local skeleton), and architectural manifest tests; npm install/build/typecheck/test all green on an empty src tree.
2026-06-30 H2a — Cross-cutting lint + architectural gates: comment-keyed no-broad-catch / no-unguarded-promise-combinator / no-blocking-sync ESLint rules in eslint-plugin-loom-local wired by eslint.config.js over src/**, plus a module-level-mutable-binding architectural scan; lint + architectural assertions run under npm test against fixtures and the real src/** tree.
