export type {
  BuildCtx,
  ChangeEvent,
  CSSResource,
  JSResource,
  ProcessedContent,
  QuartzEmitterPlugin,
  QuartzEmitterPluginInstance,
  QuartzFilterPlugin,
  QuartzFilterPluginInstance,
  QuartzPluginData,
  QuartzTransformerPlugin,
  QuartzTransformerPluginInstance,
  StaticResources,
  PageMatcher,
  PageGenerator,
  VirtualPage,
  QuartzPageTypePlugin,
  QuartzPageTypePluginInstance,
} from "@quartz-community/types";

/**
 * Per-frontmatter-type mapping to schema.org @type values.
 *
 * Quartz pages declare a `type:` field in frontmatter (e.g. `type: person`,
 * `type: project`, `type: theme`). The plugin reads that value and emits the
 * matching schema.org type. Keys are lowercase frontmatter values; values are
 * schema.org @type names.
 *
 * The defaults aim at LLM-wiki vaults (people/projects/themes/bits/career).
 * Override per site by passing the `typeMap` option.
 */
export type SchemaTypeMap = Record<string, string>;

/**
 * Publisher/Organization info attached to Article-type pages and emitted as a
 * standalone Organization block on the homepage.
 */
export interface PublisherOptions {
  /** Organization name. Required for the block to be emitted. */
  name: string;
  /** Organization URL. Defaults to the site's baseUrl. */
  url?: string;
  /** Absolute URL of an ImageObject (e.g. site logo). Optional. */
  logo?: string;
}

export interface SchemaJsonLdOptions {
  /**
   * Map of frontmatter `type:` values to schema.org `@type` strings.
   *
   * The default mapping is shaped for an LLM-wiki/fan-encyclopedia vault
   * (the plugin was originally built for robbylore.org, a fan wiki about
   * a stand-up comedian — see the README for context on `bit` and other
   * domain-specific defaults):
   *
   *   person  -> Person
   *   project -> CreativeWork
   *   episode -> CreativeWork
   *   theme   -> Article
   *   bit     -> Article
   *   career  -> Article
   *
   * By default your custom entries are MERGED with the defaults. To use
   * only your own mapping (and ignore the defaults entirely), also set
   * `mergeDefaults: false`.
   */
  typeMap: SchemaTypeMap;

  /**
   * If true (default), `typeMap` is merged with the built-in defaults so
   * you only need to specify additions or overrides. If false, the built-in
   * defaults are dropped entirely and only your `typeMap` is used.
   */
  mergeDefaults: boolean;

  /**
   * Emit a BreadcrumbList JSON-LD block derived from the page slug.
   * Defaults to true.
   */
  enableBreadcrumbs: boolean;

  /**
   * Emit a top-level WebSite JSON-LD block on the homepage.
   * Defaults to true.
   */
  enableWebSite: boolean;

  /**
   * Optional name attached to the `about` field on Article-type pages.
   * Useful for fan-wiki-style sites where every page is about a single subject.
   */
  subjectName?: string;

  /**
   * Optional URL of the subject (e.g. the canonical hub page on the same site).
   */
  subjectUrl?: string;

  /**
   * Folder slug -> friendly type-folder name for breadcrumb labels.
   * If a slug like "people" isn't in this map, the plugin falls back to a
   * Title-Case version of the slug ("people" -> "People").
   */
  breadcrumbFolderLabels: Record<string, string>;

  /**
   * Publisher/Organization info. When set:
   *   - the homepage emits a standalone Organization block alongside WebSite
   *   - every Article-type page gets a `publisher` field pointing at it
   * If unset, no publisher is emitted.
   */
  publisher?: PublisherOptions;

  /**
   * If true (default), the plugin auto-fills the `image` field for entity
   * blocks using the auto-generated OG image path emitted by the
   * `quartz-community/og-image` plugin (`<baseUrl>/<slug>-og-image.webp`).
   *
   * A page can still override the image by setting `socialImage` or `image`
   * in its frontmatter.
   *
   * Set to false to skip auto-population — only frontmatter `image`/`socialImage`
   * will produce an `image` field then.
   */
  imageFromOgImage: boolean;

  /**
   * Consolidate all per-page JSON-LD blocks into a single `<script>` tag
   * using a `@graph` array. Defaults to true. Set to false to emit each block
   * in its own script tag.
   */
  useGraph: boolean;
}
