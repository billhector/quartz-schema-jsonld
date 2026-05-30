import type { QuartzTransformerPlugin, QuartzPluginData } from "@quartz-community/types";
import type { SchemaJsonLdOptions } from "./types";
import {
  DEFAULT_TYPE_MAP,
  composeBlocks,
  resolveTypeMap,
  safeJsonStringify,
  wrapBlocks,
} from "./schema";

const DEFAULT_BREADCRUMB_LABELS: Record<string, string> = {};

const defaultOptions: SchemaJsonLdOptions = {
  typeMap: DEFAULT_TYPE_MAP,
  mergeDefaults: true,
  enableBreadcrumbs: true,
  enableWebSite: true,
  breadcrumbFolderLabels: DEFAULT_BREADCRUMB_LABELS,
  imageFromOgImage: true,
  useGraph: true,
};

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
export const SchemaJsonLd: QuartzTransformerPlugin<Partial<SchemaJsonLdOptions>> = (
  userOptions?: Partial<SchemaJsonLdOptions>,
) => {
  const opts: SchemaJsonLdOptions = {
    ...defaultOptions,
    ...userOptions,
    typeMap: resolveTypeMap(userOptions?.typeMap, userOptions?.mergeDefaults ?? true),
    mergeDefaults: userOptions?.mergeDefaults ?? true,
    breadcrumbFolderLabels: {
      ...DEFAULT_BREADCRUMB_LABELS,
      ...(userOptions?.breadcrumbFolderLabels ?? {}),
    },
  };

  return {
    name: "SchemaJsonLd",
    // No-op markdownPlugins satisfies Quartz's transformer-category validation
    // (a transformer must expose at least one of textTransform / markdownPlugins
    // / htmlPlugins). The actual work happens in externalResources below.
    markdownPlugins() {
      return [];
    },
    externalResources(ctx) {
      const cfg = ctx.cfg.configuration;
      const baseUrl = cfg.baseUrl;
      if (!baseUrl) return {};
      const siteName = cfg.pageTitle ?? "";

      return {
        additionalHead: [
          (pageData: QuartzPluginData) => {
            const blocks = composeBlocks(
              pageData as Parameters<typeof composeBlocks>[0],
              baseUrl,
              siteName,
              opts,
            );
            const wrapped = wrapBlocks(blocks, opts.useGraph);
            if (wrapped.length === 0) return null;

            return (
              <>
                {wrapped.map((block, idx) => (
                  <script
                    key={`schema-jsonld-${idx}`}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: safeJsonStringify(block) }}
                  />
                ))}
              </>
            );
          },
        ],
      };
    },
  };
};
