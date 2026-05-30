import { QuartzTransformerPlugin } from '@quartz-community/types';
export { PageGenerator, PageMatcher, QuartzComponent, QuartzComponentConstructor, QuartzComponentProps, QuartzEmitterPlugin, QuartzFilterPlugin, QuartzPageTypePlugin, QuartzPageTypePluginInstance, QuartzTransformerPlugin, VirtualPage } from '@quartz-community/types';
import { SchemaJsonLdOptions } from './types.js';
export { SchemaTypeMap } from './types.js';

/**
 * SchemaJsonLd transformer.
 *
 * Emits one or more `<script type="application/ld+json">` blocks into each
 * rendered page's <head>, based on the page's frontmatter `type:` field.
 *
 * - The homepage (slug `index` or empty) gets a WebSite block.
 * - Every non-home page gets a primary entity block whose `@type` is looked
 *   up from `options.typeMap`.
 * - Every non-home page also gets a BreadcrumbList derived from its slug
 *   path, unless `options.enableBreadcrumbs === false`.
 *
 * The plugin does NOT transform markdown or HTML. It only declares
 * `externalResources.additionalHead` entries that Quartz's Head component
 * invokes per page at render time.
 */
declare const SchemaJsonLd: QuartzTransformerPlugin<Partial<SchemaJsonLdOptions>>;

export { SchemaJsonLd, SchemaJsonLdOptions };
