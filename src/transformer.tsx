import type { QuartzTransformerPlugin, QuartzPluginData } from "@quartz-community/types";
import type { SchemaJsonLdOptions } from "./types";

const DEFAULT_TYPE_MAP: Record<string, string> = {
  person: "Person",
  project: "CreativeWork",
  episode: "CreativeWork",
  theme: "Article",
  bit: "Article",
  career: "Article",
};

const DEFAULT_BREADCRUMB_LABELS: Record<string, string> = {};

const defaultOptions: SchemaJsonLdOptions = {
  typeMap: DEFAULT_TYPE_MAP,
  enableBreadcrumbs: true,
  enableWebSite: true,
  breadcrumbFolderLabels: DEFAULT_BREADCRUMB_LABELS,
};

/**
 * Title-case a slug segment. "people" -> "People", "vegas-elopement" -> "Vegas Elopement".
 */
const titleizeSlug = (slug: string): string =>
  slug
    .split("-")
    .filter((s): s is string => s.length > 0)
    .map((s) => (s.charAt(0).toUpperCase() + s.slice(1)) as string)
    .join(" ");

/**
 * Strip trailing /index from a slug (Quartz's internal slug form).
 */
const stripIndex = (slug: string): string => slug.replace(/\/index$/, "").replace(/^index$/, "");

/**
 * Build a canonical absolute URL for a page slug.
 */
const buildUrl = (baseUrl: string, slug: string): string => {
  const stripped = stripIndex(slug);
  const path = stripped ? `/${stripped}` : "/";
  return `https://${baseUrl.replace(/\/$/, "")}${path}`;
};

/**
 * Build a BreadcrumbList JSON-LD object from a slug path.
 * Returns null for the homepage (no breadcrumbs needed).
 */
function buildBreadcrumbList(
  slug: string,
  baseUrl: string,
  siteName: string,
  folderLabels: Record<string, string>,
): Record<string, unknown> | null {
  const stripped = stripIndex(slug);
  if (!stripped) return null;

  const segments = stripped.split("/").filter((s) => s.length > 0);
  if (segments.length === 0) return null;

  const items: Array<Record<string, unknown>> = [
    {
      "@type": "ListItem",
      position: 1,
      name: siteName,
      item: `https://${baseUrl.replace(/\/$/, "")}/`,
    },
  ];

  let cumulative = "";
  segments.forEach((segment, index) => {
    cumulative = cumulative ? `${cumulative}/${segment}` : segment;
    const labelOverride = folderLabels[segment];
    const name = labelOverride ?? titleizeSlug(segment);
    items.push({
      "@type": "ListItem",
      position: index + 2,
      name,
      item: `https://${baseUrl.replace(/\/$/, "")}/${cumulative}`,
    });
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

/**
 * Build a primary entity JSON-LD object based on the frontmatter type.
 * Returns null if no matching type or no useful data.
 */
function buildEntity(
  frontmatter: Record<string, unknown> | undefined,
  slug: string,
  baseUrl: string,
  opts: SchemaJsonLdOptions,
): Record<string, unknown> | null {
  if (!frontmatter) return null;

  const rawType = typeof frontmatter.type === "string" ? frontmatter.type.toLowerCase() : "";
  const schemaType = opts.typeMap[rawType];
  if (!schemaType) return null;

  const title =
    typeof frontmatter.title === "string" && frontmatter.title.length > 0
      ? frontmatter.title
      : titleizeSlug(stripIndex(slug).split("/").pop() ?? "");

  const description =
    typeof frontmatter.description === "string" && frontmatter.description.length > 0
      ? frontmatter.description
      : undefined;

  const pageUrl = buildUrl(baseUrl, slug);

  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: title,
    url: pageUrl,
  };

  if (description) {
    base.description = description;
  }

  // Article-type pages can carry an `about` reference to the subject of the
  // overall site (e.g. Robby Hoffman for robbylore.org).
  if (schemaType === "Article" && opts.subjectName) {
    base.headline = title;
    if (opts.subjectUrl) {
      base.about = {
        "@type": "Person",
        name: opts.subjectName,
        url: opts.subjectUrl,
      };
    } else {
      base.about = { "@type": "Person", name: opts.subjectName };
    }
  }

  return base;
}

/**
 * Build the WebSite JSON-LD block. Only emitted on the homepage.
 */
function buildWebSite(
  baseUrl: string,
  siteName: string,
  description?: string,
): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: `https://${baseUrl.replace(/\/$/, "")}/`,
  };
  if (description) obj.description = description;
  return obj;
}

/**
 * Stringify a JSON-LD object for safe embedding inside a <script type="application/ld+json"> tag.
 * The dangerous substring `</` must be escaped to prevent early script-tag close in inline contexts.
 */
const safeJsonStringify = (obj: unknown): string =>
  JSON.stringify(obj, null, 2).replace(/</g, "\\u003c");

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
export const SchemaJsonLd: QuartzTransformerPlugin<Partial<SchemaJsonLdOptions>> = (
  userOptions?: Partial<SchemaJsonLdOptions>,
) => {
  const opts: SchemaJsonLdOptions = {
    ...defaultOptions,
    ...userOptions,
    typeMap: { ...DEFAULT_TYPE_MAP, ...(userOptions?.typeMap ?? {}) },
    breadcrumbFolderLabels: {
      ...DEFAULT_BREADCRUMB_LABELS,
      ...(userOptions?.breadcrumbFolderLabels ?? {}),
    },
  };

  return {
    name: "SchemaJsonLd",
    externalResources(ctx) {
      const cfg = ctx.cfg.configuration;
      const baseUrl = cfg.baseUrl;
      if (!baseUrl) {
        return {};
      }
      const siteName = cfg.pageTitle ?? "";

      return {
        additionalHead: [
          (pageData: QuartzPluginData) => {
            const slug = (pageData.slug as string | undefined) ?? "";
            const frontmatter = pageData.frontmatter as Record<string, unknown> | undefined;
            const isHome = !slug || slug === "index" || slug === "/";

            const blocks: Array<Record<string, unknown>> = [];

            if (isHome && opts.enableWebSite) {
              const desc =
                typeof frontmatter?.description === "string" ? frontmatter.description : undefined;
              blocks.push(buildWebSite(baseUrl, siteName, desc));
            } else {
              const entity = buildEntity(frontmatter, slug, baseUrl, opts);
              if (entity) blocks.push(entity);

              if (opts.enableBreadcrumbs) {
                const crumbs = buildBreadcrumbList(
                  slug,
                  baseUrl,
                  siteName,
                  opts.breadcrumbFolderLabels,
                );
                if (crumbs) blocks.push(crumbs);
              }
            }

            if (blocks.length === 0) return null;

            return (
              <>
                {blocks.map((block, idx) => (
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
