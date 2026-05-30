/**
 * Pure schema.org JSON-LD builders.
 *
 * All functions here are deterministic, side-effect-free, and easy to test.
 * The actual Quartz transformer entry point lives in `transformer.tsx` and
 * just wires these helpers up to `externalResources.additionalHead`.
 */

import type { SchemaJsonLdOptions, PublisherOptions } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type PageData = {
  slug?: string;
  frontmatter?: Record<string, any>;
  dates?: { created?: Date; modified?: Date; published?: Date };
  [k: string]: any;
};

export const DEFAULT_TYPE_MAP: Record<string, string> = {
  person: "Person",
  project: "CreativeWork",
  episode: "CreativeWork",
  theme: "Article",
  bit: "Article",
  career: "Article",
};

/**
 * Title-case a slug segment. "people" -> "People", "vegas-elopement" -> "Vegas Elopement".
 */
export const titleizeSlug = (slug: string): string =>
  slug
    .split("-")
    .filter((s): s is string => s.length > 0)
    .map((s) => (s.charAt(0).toUpperCase() + s.slice(1)) as string)
    .join(" ");

/**
 * Strip a trailing `/index` from a slug (Quartz's internal slug form for
 * folder landing pages). Also collapses the bare `index` slug to empty.
 */
export const stripIndex = (slug: string): string =>
  slug.replace(/\/index$/, "").replace(/^index$/, "");

/**
 * Build a canonical absolute URL for a page slug.
 */
export const buildPageUrl = (baseUrl: string, slug: string): string => {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const stripped = stripIndex(slug);
  return stripped ? `https://${cleanBase}/${stripped}` : `https://${cleanBase}/`;
};

/**
 * True if the slug refers to the site homepage (empty slug, "index", "/").
 */
export const isHomeSlug = (slug: string): boolean =>
  !slug || slug === "index" || slug === "/" || slug === "";

/**
 * Strip Obsidian wikilink wrappers ([[Name]] -> Name) and trim whitespace.
 */
export const stripWikilink = (value: string): string =>
  value
    .replace(/^\s*\[\[/, "")
    .replace(/\]\]\s*$/, "")
    .trim();

/**
 * Coerce a frontmatter value into an array of strings. Handles:
 *   - string         -> [string]
 *   - string[]       -> string[]
 *   - other          -> []
 * Each entry is wikilink-stripped.
 */
export function asStringArray(value: unknown): string[] {
  if (typeof value === "string") return [stripWikilink(value)];
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string").map(stripWikilink);
  }
  return [];
}

/**
 * Pick the first defined string from a list of frontmatter keys.
 */
export function pickString(
  frontmatter: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined {
  if (!frontmatter) return undefined;
  for (const key of keys) {
    const value = frontmatter[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

/**
 * Pick the first defined Date-coercible value from a list of locations.
 * Returns an ISO 8601 date string, or undefined.
 */
export function pickDate(
  frontmatter: Record<string, unknown> | undefined,
  dates: { created?: Date; modified?: Date; published?: Date } | undefined,
  frontmatterKeys: string[],
  datesKey: keyof NonNullable<typeof dates>,
): string | undefined {
  if (frontmatter) {
    for (const key of frontmatterKeys) {
      const v = frontmatter[key];
      if (typeof v === "string" && v.length > 0) return v;
      if (v instanceof Date) return v.toISOString().slice(0, 10);
    }
  }
  if (dates && dates[datesKey] instanceof Date) {
    return (dates[datesKey] as Date).toISOString().slice(0, 10);
  }
  return undefined;
}

/**
 * Build the OG-image URL the `og-image` Quartz plugin generates by default.
 * Pages override via frontmatter `socialImage:` (absolute or static-relative).
 * Returns undefined when there's no slug to anchor on.
 */
export function defaultOgImageUrl(baseUrl: string, slug: string): string | undefined {
  const stripped = stripIndex(slug);
  if (!stripped) return `https://${baseUrl.replace(/\/$/, "")}/static/og-image.png`;
  return `https://${baseUrl.replace(/\/$/, "")}/${stripped}-og-image.webp`;
}

/**
 * Resolve the image to use for a schema entity. Order of precedence:
 *   1. frontmatter.socialImage (absolute or static-relative path)
 *   2. frontmatter.image (absolute URL)
 *   3. og-image default — if imageFromOgImage is true
 */
export function resolveImageUrl(
  frontmatter: Record<string, unknown> | undefined,
  baseUrl: string,
  slug: string,
  imageFromOgImage: boolean,
): string | undefined {
  const socialImage = pickString(frontmatter, ["socialImage"]);
  if (socialImage) {
    if (/^https?:\/\//.test(socialImage)) return socialImage;
    return `https://${baseUrl.replace(/\/$/, "")}/static/${socialImage}`;
  }
  const image = pickString(frontmatter, ["image"]);
  if (image && /^https?:\/\//.test(image)) return image;
  if (imageFromOgImage) return defaultOgImageUrl(baseUrl, slug);
  return undefined;
}

/**
 * Build the schema.org Person object for the `author` field.
 * Accepts either a plain string (treated as Person name) or an array of names.
 * Returns:
 *   - undefined when no author
 *   - a single Person object when there's exactly one
 *   - an array of Person objects otherwise
 */
export function buildAuthorBlock(
  authorValue: unknown,
): Record<string, unknown> | Record<string, unknown>[] | undefined {
  const names = asStringArray(authorValue);
  if (names.length === 0) return undefined;
  const persons = names.map((name) => ({ "@type": "Person", name }));
  return persons.length === 1 ? persons[0] : persons;
}

/**
 * Build the Organization block for a publisher. Returns undefined if no name.
 */
export function buildPublisherBlock(
  publisher: PublisherOptions | undefined,
): Record<string, unknown> | undefined {
  if (!publisher || !publisher.name) return undefined;
  const block: Record<string, unknown> = {
    "@type": "Organization",
    name: publisher.name,
  };
  if (publisher.url) block.url = publisher.url;
  if (publisher.logo) {
    block.logo = { "@type": "ImageObject", url: publisher.logo };
  }
  return block;
}

/**
 * Build a BreadcrumbList JSON-LD object from a slug path.
 * Returns null for the homepage (no breadcrumbs needed).
 */
export function buildBreadcrumbList(
  slug: string,
  baseUrl: string,
  siteName: string,
  folderLabels: Record<string, string>,
): Record<string, unknown> | null {
  const stripped = stripIndex(slug);
  if (!stripped) return null;
  const segments = stripped.split("/").filter((s) => s.length > 0);
  if (segments.length === 0) return null;

  const cleanBase = baseUrl.replace(/\/$/, "");
  const items: Array<Record<string, unknown>> = [
    {
      "@type": "ListItem",
      position: 1,
      name: siteName,
      item: `https://${cleanBase}/`,
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
      item: `https://${cleanBase}/${cumulative}`,
    });
  });

  return {
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

/**
 * Build the primary entity JSON-LD object for a non-home page.
 * Returns null when no schemaType could be resolved or the page is disabled.
 */
export function buildEntity(
  pageData: PageData,
  baseUrl: string,
  opts: SchemaJsonLdOptions,
): Record<string, unknown> | null {
  const frontmatter = pageData.frontmatter as Record<string, unknown> | undefined;
  if (!frontmatter) return null;

  if (frontmatter.schemaDisabled === true) return null;

  const explicitType = pickString(frontmatter, ["schemaType"]);
  const rawType = typeof frontmatter.type === "string" ? frontmatter.type.toLowerCase() : "";
  const schemaType = explicitType ?? opts.typeMap[rawType];
  if (!schemaType) return null;

  const slug = pageData.slug ?? "";

  const title =
    pickString(frontmatter, ["title"]) ?? titleizeSlug(stripIndex(slug).split("/").pop() ?? "");

  const description = pickString(frontmatter, ["description", "socialDescription"]);

  const pageUrl = buildPageUrl(baseUrl, slug);

  const base: Record<string, unknown> = {
    "@type": schemaType,
    name: title,
    url: pageUrl,
  };

  if (description) base.description = description;

  const image = resolveImageUrl(frontmatter, baseUrl, slug, opts.imageFromOgImage);
  if (image) base.image = image;

  const sameAs = asStringArray(frontmatter.sameAs);
  if (sameAs.length > 0) base.sameAs = sameAs;

  const author = buildAuthorBlock(frontmatter.author);
  if (author !== undefined) base.author = author;

  const datePublished = pickDate(
    frontmatter,
    pageData.dates,
    ["datePublished", "published"],
    "created",
  );
  if (datePublished) base.datePublished = datePublished;

  const dateModified = pickDate(
    frontmatter,
    pageData.dates,
    ["dateModified", "modified"],
    "modified",
  );
  if (dateModified) base.dateModified = dateModified;

  if (schemaType === "Article") {
    base.headline = title;
    if (opts.subjectName) {
      base.about = opts.subjectUrl
        ? { "@type": "Person", name: opts.subjectName, url: opts.subjectUrl }
        : { "@type": "Person", name: opts.subjectName };
    }
    const pub = buildPublisherBlock(opts.publisher);
    if (pub) base.publisher = pub;
  }

  return base;
}

/**
 * Build the WebSite JSON-LD block. Only emitted on the homepage.
 */
export function buildWebSite(
  baseUrl: string,
  siteName: string,
  description?: string,
): Record<string, unknown> {
  const obj: Record<string, unknown> = {
    "@type": "WebSite",
    name: siteName,
    url: `https://${baseUrl.replace(/\/$/, "")}/`,
  };
  if (description) obj.description = description;
  return obj;
}

/**
 * Resolve the merged typeMap from defaults + user input.
 */
export function resolveTypeMap(
  userTypeMap: Record<string, string> | undefined,
  mergeDefaults: boolean,
): Record<string, string> {
  return mergeDefaults
    ? { ...DEFAULT_TYPE_MAP, ...(userTypeMap ?? {}) }
    : { ...(userTypeMap ?? {}) };
}

/**
 * Compose the per-page list of JSON-LD blocks.
 * Returns an empty array when the page has nothing to emit.
 */
export function composeBlocks(
  pageData: PageData,
  baseUrl: string,
  siteName: string,
  opts: SchemaJsonLdOptions,
): Record<string, unknown>[] {
  const slug = pageData.slug ?? "";
  const isHome = isHomeSlug(slug);
  const blocks: Record<string, unknown>[] = [];

  if (isHome) {
    if (opts.enableWebSite) {
      const desc = pickString(pageData.frontmatter, ["description"]);
      blocks.push(buildWebSite(baseUrl, siteName, desc));
    }
    const pub = buildPublisherBlock(opts.publisher);
    if (pub) blocks.push(pub);
  } else {
    const entity = buildEntity(pageData, baseUrl, opts);
    if (entity) blocks.push(entity);
    if (opts.enableBreadcrumbs) {
      const crumbs = buildBreadcrumbList(slug, baseUrl, siteName, opts.breadcrumbFolderLabels);
      if (crumbs) blocks.push(crumbs);
    }
  }

  return blocks;
}

/**
 * Wrap one or more JSON-LD blocks. If `useGraph` is true, all blocks share a
 * single `@graph` envelope. Otherwise each block is returned as its own
 * top-level object with its own `@context`.
 */
export function wrapBlocks(
  blocks: Record<string, unknown>[],
  useGraph: boolean,
): Record<string, unknown>[] {
  if (blocks.length === 0) return [];
  if (useGraph) {
    return [{ "@context": "https://schema.org", "@graph": blocks }];
  }
  return blocks.map((b) => ({ "@context": "https://schema.org", ...b }));
}

/**
 * Safely stringify a JSON-LD object for embedding inside a
 * `<script type="application/ld+json">` tag. Escapes `<` to its unicode
 * form to prevent script-tag breakout from frontmatter values containing
 * literal `</script>` or `<!--` sequences. JSON.parse reconstructs the
 * original character client-side.
 */
export const safeJsonStringify = (obj: unknown): string =>
  JSON.stringify(obj, null, 2).replace(/</g, "\\u003c");
