import { QuartzTransformerPlugin } from '@quartz-community/types';
export { PageGenerator, PageMatcher, QuartzComponent, QuartzComponentConstructor, QuartzComponentProps, QuartzEmitterPlugin, QuartzFilterPlugin, QuartzPageTypePlugin, QuartzPageTypePluginInstance, QuartzTransformerPlugin, VirtualPage } from '@quartz-community/types';
import { SchemaJsonLdOptions, PublisherOptions } from './types.js';
export { SchemaTypeMap } from './types.js';

/**
 * SchemaJsonLd transformer.
 *
 * Emits one or more `<script type="application/ld+json">` blocks into each
 * rendered page's <head>, driven by the page's frontmatter.
 *
 * Per-page output (default, with `useGraph: true`):
 *   - One <script> containing a `@graph` array of all relevant blocks.
 *
 * Per-page output with `useGraph: false`:
 *   - Multiple <script> tags, one per block.
 *
 * Block inventory:
 *   - Homepage: WebSite (+ Organization if `publisher` option is set).
 *   - Non-home pages: primary entity block whose `@type` is resolved from
 *     frontmatter `schemaType:` (explicit override) or looked up by
 *     `frontmatter.type` in `options.typeMap`. Plus a BreadcrumbList unless
 *     disabled. Article-shaped entities get `about: Person` (when subjectName
 *     is set) and `publisher: Organization` (when publisher is set).
 *
 * Per-page frontmatter the plugin reads:
 *   - `type:` — primary lookup key into typeMap
 *   - `schemaType:` — explicit @type override (bypasses typeMap)
 *   - `schemaDisabled: true` — skip schema emission for this page
 *   - `title:` — `name` / `headline`
 *   - `description:` (or `socialDescription:`) — `description`
 *   - `image:` (absolute URL) or `socialImage:` (path or URL) — `image`
 *   - `sameAs:` (array of URLs) — Person/Organization sameAs
 *   - `author:` (string or wikilink array) — Person author block
 *   - `datePublished:` / `published:` — `datePublished` (ISO 8601)
 *   - `dateModified:` / `modified:` — `dateModified` (ISO 8601)
 *
 * The plugin does NOT transform markdown or HTML. It only declares
 * `externalResources.additionalHead` entries that Quartz's Head component
 * invokes per page at render time.
 */
declare const SchemaJsonLd: QuartzTransformerPlugin<Partial<SchemaJsonLdOptions>>;

/**
 * Pure schema.org JSON-LD builders.
 *
 * All functions here are deterministic, side-effect-free, and easy to test.
 * The actual Quartz transformer entry point lives in `transformer.tsx` and
 * just wires these helpers up to `externalResources.additionalHead`.
 */

type PageData = {
    slug?: string;
    frontmatter?: Record<string, any>;
    dates?: {
        created?: Date;
        modified?: Date;
        published?: Date;
    };
    [k: string]: any;
};
declare const DEFAULT_TYPE_MAP: Record<string, string>;
/**
 * Title-case a slug segment. "people" -> "People", "vegas-elopement" -> "Vegas Elopement".
 */
declare const titleizeSlug: (slug: string) => string;
/**
 * Build the Organization block for a publisher. Returns undefined if no name.
 */
declare function buildPublisherBlock(publisher: PublisherOptions | undefined): Record<string, unknown> | undefined;
/**
 * Build a BreadcrumbList JSON-LD object from a slug path.
 * Returns null for the homepage (no breadcrumbs needed).
 */
declare function buildBreadcrumbList(slug: string, baseUrl: string, siteName: string, folderLabels: Record<string, string>): Record<string, unknown> | null;
/**
 * Build the primary entity JSON-LD object for a non-home page.
 * Returns null when no schemaType could be resolved or the page is disabled.
 */
declare function buildEntity(pageData: PageData, baseUrl: string, opts: SchemaJsonLdOptions): Record<string, unknown> | null;
/**
 * Build the WebSite JSON-LD block. Only emitted on the homepage.
 */
declare function buildWebSite(baseUrl: string, siteName: string, description?: string): Record<string, unknown>;
/**
 * Resolve the merged typeMap from defaults + user input.
 */
declare function resolveTypeMap(userTypeMap: Record<string, string> | undefined, mergeDefaults: boolean): Record<string, string>;
/**
 * Compose the per-page list of JSON-LD blocks.
 * Returns an empty array when the page has nothing to emit.
 */
declare function composeBlocks(pageData: PageData, baseUrl: string, siteName: string, opts: SchemaJsonLdOptions): Record<string, unknown>[];
/**
 * Wrap one or more JSON-LD blocks. If `useGraph` is true, all blocks share a
 * single `@graph` envelope. Otherwise each block is returned as its own
 * top-level object with its own `@context`.
 */
declare function wrapBlocks(blocks: Record<string, unknown>[], useGraph: boolean): Record<string, unknown>[];
/**
 * Safely stringify a JSON-LD object for embedding inside a
 * `<script type="application/ld+json">` tag. Escapes `<` to its unicode
 * form to prevent script-tag breakout from frontmatter values containing
 * literal `</script>` or `<!--` sequences. JSON.parse reconstructs the
 * original character client-side.
 */
declare const safeJsonStringify: (obj: unknown) => string;

export { DEFAULT_TYPE_MAP, PublisherOptions, SchemaJsonLd, SchemaJsonLdOptions, buildBreadcrumbList, buildEntity, buildPublisherBlock, buildWebSite, composeBlocks, resolveTypeMap, safeJsonStringify, titleizeSlug, wrapBlocks };
