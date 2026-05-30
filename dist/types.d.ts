export { BuildCtx, CSSResource, ChangeEvent, JSResource, PageGenerator, PageMatcher, ProcessedContent, QuartzEmitterPlugin, QuartzEmitterPluginInstance, QuartzFilterPlugin, QuartzFilterPluginInstance, QuartzPageTypePlugin, QuartzPageTypePluginInstance, QuartzPluginData, QuartzTransformerPlugin, QuartzTransformerPluginInstance, StaticResources, VirtualPage } from '@quartz-community/types';

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
type SchemaTypeMap = Record<string, string>;
interface SchemaJsonLdOptions {
    /**
     * Map of frontmatter `type:` values to schema.org `@type` strings.
     * Default: { person: "Person", project: "CreativeWork", episode: "CreativeWork",
     * theme: "Article", bit: "Article", career: "Article" }
     */
    typeMap: SchemaTypeMap;
    /**
     * Optional name attached to the author / about field on Article-type pages.
     * Useful for fan-wiki-style sites where every page is about a single subject.
     * If unset, the schema omits author/about.
     */
    subjectName?: string;
    /**
     * Optional URL of the subject (e.g. the canonical hub page on the same site).
     */
    subjectUrl?: string;
    /**
     * Emit a BreadcrumbList JSON-LD block derived from the page slug.
     * Defaults to true. Disable only if you have multiple breadcrumb sources.
     */
    enableBreadcrumbs: boolean;
    /**
     * Emit a top-level WebSite JSON-LD block on the homepage.
     * Defaults to true.
     */
    enableWebSite: boolean;
    /**
     * Folder slug -> friendly type-folder name for breadcrumb labels.
     * If a slug like "people" isn't in this map, the plugin falls back to a
     * Title-Case version of the slug ("people" -> "People").
     */
    breadcrumbFolderLabels: Record<string, string>;
}

export type { SchemaJsonLdOptions, SchemaTypeMap };
