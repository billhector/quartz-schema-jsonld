# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-05-30

Initial public release.

### Added

- Quartz v5 transformer plugin that emits schema.org JSON-LD into every page's `<head>`.
- Per-page primary entity block whose `@type` is resolved from frontmatter — either explicitly via `schemaType:`, or via `typeMap[frontmatter.type]`.
- Default `typeMap` shaped for an LLM-wiki vault: `person → Person`, `project → CreativeWork`, `episode → CreativeWork`, `theme → Article`, `bit → Article`, `career → Article`.
- `BreadcrumbList` block on every non-home page, derived from the slug path. Folder labels overridable via `breadcrumbFolderLabels`.
- `WebSite` block on the homepage.
- Optional `publisher` option emits a standalone `Organization` block on the homepage and attaches a `publisher` field to every `Article`-type page.
- Optional `subjectName` / `subjectUrl` options add an `about: Person` field to `Article`-type pages — useful for single-subject fan wikis.
- Frontmatter passthrough: `image:` / `socialImage:`, `sameAs:`, `author:` (with Obsidian wikilink stripping), `datePublished:` / `published:`, `dateModified:` / `modified:`. Dates fall back to `pageData.dates.created` / `.modified` from Quartz's `created-modified-date` plugin.
- `imageFromOgImage: true` (default) auto-fills the `image` field using the path emitted by the `quartz-community/og-image` plugin.
- `useGraph: true` (default) consolidates per-page blocks into a single `<script>` using `@graph`. Set to `false` to emit each block in its own `<script>`.
- `schemaDisabled: true` frontmatter field skips schema emission for a specific page.
- `mergeDefaults: false` option drops the built-in `typeMap` defaults entirely.
- Script-tag-breakout guard: every `<` character inside the JSON-LD is escaped to `<` so frontmatter containing literal `</script>` or `<!--` cannot close the script tag early.
- Vitest unit test suite covering 61 cases across all helper functions.
- Manifest validation in `tsup.config.ts` (carried over from `quartz-community/plugin-template`).

### Notes

- Built on top of `quartz-community/plugin-template`. Inherits its TypeScript strict mode, ESLint config, Prettier config, and Vitest setup.
- Requires Quartz `>=5.0.0`.
- Plugin runs as a `transformer` category — the markdown pipeline itself is untouched. A no-op `markdownPlugins() => []` is exposed solely to satisfy Quartz's transformer-category validator (which requires at least one of `textTransform` / `markdownPlugins` / `htmlPlugins`).
