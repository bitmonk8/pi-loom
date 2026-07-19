# Discovery

Theta files are discovered from five sources. The global, project, and package-conventional roots mirror the leaf-directory layout Pi uses for its own prompt templates, but the theta extension owns the discovery walk end-to-end: Pi has no `thetaPaths` slot in `resources_discover` (the event carries `skillPaths`, `promptPaths`, `themePaths` only — see `@earendil-works/pi-coding-agent/docs/extensions.md` §`resources_discover`), and the `pi` manifest namespace recognises only `extensions`, `skills`, `prompts`, `themes`, `video`, and `image` (see `packages.md` §"Creating a Pi Package"). The package-manifest entry (`pi.theta`), the settings array (`thetaPaths`), and the CLI flag (`--theta`) are therefore conventions defined by **this extension**; Pi does not enumerate them and does not pass them to the extension. The theta extension reads them itself — settings via the injected `FileSystem` seam (see [Settings file reads](./discovery/package-and-settings.md#settings-file-reads)), `pi.theta` and the conventional `theta/` directory by walking installed package roots (see [Package discovery](./discovery/package-and-settings.md#package-discovery)), and `--theta` via a flag the extension registers itself in its factory (see [Pi Integration Contract](./pi-integration-contract.md)). The five sources are:

## Contents

- [Discovery sources](./discovery/discovery-sources.md)
- [Package and settings](./discovery/package-and-settings.md)
