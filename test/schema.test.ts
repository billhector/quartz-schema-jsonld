import { describe, it, expect } from "vitest";
import {
  DEFAULT_TYPE_MAP,
  asStringArray,
  buildAuthorBlock,
  buildBreadcrumbList,
  buildEntity,
  buildPageUrl,
  buildPublisherBlock,
  buildWebSite,
  composeBlocks,
  defaultOgImageUrl,
  isHomeSlug,
  pickDate,
  pickString,
  resolveImageUrl,
  resolveTypeMap,
  safeJsonStringify,
  stripIndex,
  stripWikilink,
  titleizeSlug,
  wrapBlocks,
} from "../src/schema";
import type { SchemaJsonLdOptions } from "../src/types";

const baseOpts: SchemaJsonLdOptions = {
  typeMap: DEFAULT_TYPE_MAP,
  mergeDefaults: true,
  enableBreadcrumbs: true,
  enableWebSite: true,
  breadcrumbFolderLabels: {},
  imageFromOgImage: true,
  useGraph: true,
};

describe("titleizeSlug", () => {
  it("titlecases a single word", () => {
    expect(titleizeSlug("people")).toBe("People");
  });
  it("titlecases hyphenated words", () => {
    expect(titleizeSlug("vegas-elopement")).toBe("Vegas Elopement");
  });
  it("handles empty input", () => {
    expect(titleizeSlug("")).toBe("");
  });
  it("collapses empty segments from double dashes", () => {
    expect(titleizeSlug("foo--bar")).toBe("Foo Bar");
  });
});

describe("stripIndex", () => {
  it("strips trailing /index", () => {
    expect(stripIndex("people/index")).toBe("people");
  });
  it("strips bare 'index'", () => {
    expect(stripIndex("index")).toBe("");
  });
  it("leaves non-index slugs alone", () => {
    expect(stripIndex("people/robby-hoffman")).toBe("people/robby-hoffman");
  });
});

describe("isHomeSlug", () => {
  it("detects homepage variants", () => {
    expect(isHomeSlug("")).toBe(true);
    expect(isHomeSlug("index")).toBe(true);
    expect(isHomeSlug("/")).toBe(true);
  });
  it("rejects subpages", () => {
    expect(isHomeSlug("people")).toBe(false);
    expect(isHomeSlug("people/robby-hoffman")).toBe(false);
  });
});

describe("buildPageUrl", () => {
  it("builds homepage URL", () => {
    expect(buildPageUrl("example.com", "")).toBe("https://example.com/");
    expect(buildPageUrl("example.com", "index")).toBe("https://example.com/");
  });
  it("builds subpage URL", () => {
    expect(buildPageUrl("example.com", "people/robby")).toBe("https://example.com/people/robby");
  });
  it("trims trailing slash from baseUrl", () => {
    expect(buildPageUrl("example.com/", "foo")).toBe("https://example.com/foo");
  });
});

describe("stripWikilink", () => {
  it("strips [[name]] wrappers", () => {
    expect(stripWikilink("[[Horatia Harrod]]")).toBe("Horatia Harrod");
  });
  it("leaves plain strings alone", () => {
    expect(stripWikilink("Bare Name")).toBe("Bare Name");
  });
});

describe("asStringArray", () => {
  it("returns empty for non-string/array", () => {
    expect(asStringArray(undefined)).toEqual([]);
    expect(asStringArray(42)).toEqual([]);
  });
  it("wraps a single string", () => {
    expect(asStringArray("foo")).toEqual(["foo"]);
  });
  it("filters out non-strings", () => {
    expect(asStringArray(["a", 2, "b"])).toEqual(["a", "b"]);
  });
  it("strips wikilinks in each entry", () => {
    expect(asStringArray(["[[Alice]]", "Bob"])).toEqual(["Alice", "Bob"]);
  });
});

describe("pickString", () => {
  it("returns first defined non-empty string", () => {
    expect(pickString({ a: "", b: "hit" }, ["a", "b"])).toBe("hit");
  });
  it("ignores non-string values", () => {
    expect(pickString({ a: 42, b: "fine" }, ["a", "b"])).toBe("fine");
  });
  it("returns undefined for missing", () => {
    expect(pickString({}, ["x", "y"])).toBeUndefined();
    expect(pickString(undefined, ["x"])).toBeUndefined();
  });
});

describe("pickDate", () => {
  it("prefers frontmatter string", () => {
    expect(pickDate({ datePublished: "2026-01-15" }, undefined, ["datePublished"], "created")).toBe(
      "2026-01-15",
    );
  });
  it("falls back to dates.created", () => {
    const d = new Date("2026-04-01T00:00:00Z");
    expect(pickDate({}, { created: d }, ["datePublished"], "created")).toBe("2026-04-01");
  });
  it("returns undefined when nothing matches", () => {
    expect(pickDate({}, undefined, ["datePublished"], "created")).toBeUndefined();
  });
});

describe("buildAuthorBlock", () => {
  it("returns undefined for empty", () => {
    expect(buildAuthorBlock(undefined)).toBeUndefined();
  });
  it("builds a single Person object for a single name", () => {
    expect(buildAuthorBlock("Alice")).toEqual({ "@type": "Person", name: "Alice" });
  });
  it("builds an array of Person objects for multiple names", () => {
    expect(buildAuthorBlock(["[[Alice]]", "Bob"])).toEqual([
      { "@type": "Person", name: "Alice" },
      { "@type": "Person", name: "Bob" },
    ]);
  });
});

describe("buildPublisherBlock", () => {
  it("returns undefined without a name", () => {
    expect(buildPublisherBlock(undefined)).toBeUndefined();
    expect(buildPublisherBlock({ name: "" })).toBeUndefined();
  });
  it("emits name + optional url/logo", () => {
    expect(
      buildPublisherBlock({
        name: "Acme",
        url: "https://acme.com",
        logo: "https://acme.com/l.png",
      }),
    ).toEqual({
      "@type": "Organization",
      name: "Acme",
      url: "https://acme.com",
      logo: { "@type": "ImageObject", url: "https://acme.com/l.png" },
    });
  });
});

describe("buildBreadcrumbList", () => {
  it("returns null for homepage", () => {
    expect(buildBreadcrumbList("", "example.com", "Site", {})).toBeNull();
    expect(buildBreadcrumbList("index", "example.com", "Site", {})).toBeNull();
  });
  it("builds a 3-item trail for a 2-segment slug", () => {
    const list = buildBreadcrumbList("people/alice", "example.com", "My Site", {});
    expect(list).not.toBeNull();
    const items = list!.itemListElement as Record<string, unknown>[];
    expect(items.length).toBe(3);
    expect(items[0]).toMatchObject({ position: 1, name: "My Site", item: "https://example.com/" });
    expect(items[1]).toMatchObject({
      position: 2,
      name: "People",
      item: "https://example.com/people",
    });
    expect(items[2]).toMatchObject({
      position: 3,
      name: "Alice",
      item: "https://example.com/people/alice",
    });
  });
  it("applies folder-label overrides", () => {
    const list = buildBreadcrumbList("wp-tools/foo", "example.com", "Site", {
      "wp-tools": "WP Tools",
    });
    const items = list!.itemListElement as Record<string, unknown>[];
    expect(items[1]).toMatchObject({ name: "WP Tools" });
  });
});

describe("defaultOgImageUrl", () => {
  it("returns site-level default for homepage", () => {
    expect(defaultOgImageUrl("example.com", "")).toBe("https://example.com/static/og-image.png");
  });
  it("returns per-page WebP for subpage", () => {
    expect(defaultOgImageUrl("example.com", "people/alice")).toBe(
      "https://example.com/people/alice-og-image.webp",
    );
  });
});

describe("resolveImageUrl", () => {
  const base = "example.com";
  it("prefers absolute socialImage", () => {
    expect(
      resolveImageUrl({ socialImage: "https://cdn.example.com/x.png" }, base, "foo", true),
    ).toBe("https://cdn.example.com/x.png");
  });
  it("treats relative socialImage as /static/<value>", () => {
    expect(resolveImageUrl({ socialImage: "hero.png" }, base, "foo", true)).toBe(
      "https://example.com/static/hero.png",
    );
  });
  it("uses frontmatter image when absolute", () => {
    expect(resolveImageUrl({ image: "https://x.com/y.jpg" }, base, "foo", false)).toBe(
      "https://x.com/y.jpg",
    );
  });
  it("falls back to og-image default", () => {
    expect(resolveImageUrl({}, base, "foo", true)).toBe("https://example.com/foo-og-image.webp");
  });
  it("returns undefined when nothing matches and imageFromOgImage is false", () => {
    expect(resolveImageUrl({}, base, "foo", false)).toBeUndefined();
  });
});

describe("resolveTypeMap", () => {
  it("merges defaults when mergeDefaults is true", () => {
    const map = resolveTypeMap({ recipe: "Recipe" }, true);
    expect(map).toMatchObject({ ...DEFAULT_TYPE_MAP, recipe: "Recipe" });
  });
  it("uses only user map when mergeDefaults is false", () => {
    const map = resolveTypeMap({ recipe: "Recipe" }, false);
    expect(map).toEqual({ recipe: "Recipe" });
    expect(map.person).toBeUndefined();
  });
  it("user values override defaults during merge", () => {
    const map = resolveTypeMap({ bit: "HowTo" }, true);
    expect(map.bit).toBe("HowTo");
  });
});

describe("buildEntity", () => {
  const base = "example.com";
  it("returns null for missing frontmatter", () => {
    expect(buildEntity({}, base, baseOpts)).toBeNull();
  });
  it("returns null when type is not in typeMap and no schemaType is set", () => {
    expect(
      buildEntity({ frontmatter: { type: "unknown", title: "x" }, slug: "foo" }, base, baseOpts),
    ).toBeNull();
  });
  it("returns null when schemaDisabled is true", () => {
    expect(
      buildEntity(
        { frontmatter: { type: "person", schemaDisabled: true, title: "x" }, slug: "foo" },
        base,
        baseOpts,
      ),
    ).toBeNull();
  });
  it("emits Person for type:person", () => {
    const e = buildEntity(
      { frontmatter: { type: "person", title: "Alice", description: "A" }, slug: "p/alice" },
      base,
      baseOpts,
    );
    expect(e).toMatchObject({
      "@type": "Person",
      name: "Alice",
      url: "https://example.com/p/alice",
      description: "A",
    });
  });
  it("honors schemaType override", () => {
    const e = buildEntity(
      {
        frontmatter: { type: "person", schemaType: "MusicGroup", title: "Band" },
        slug: "bands/x",
      },
      base,
      baseOpts,
    );
    expect(e!["@type"]).toBe("MusicGroup");
  });
  it("adds about + headline for Article", () => {
    const opts = { ...baseOpts, subjectName: "Robby Hoffman", subjectUrl: "https://x/p/robby" };
    const e = buildEntity(
      { frontmatter: { type: "theme", title: "Money" }, slug: "themes/money" },
      base,
      opts,
    );
    expect(e).toMatchObject({
      "@type": "Article",
      headline: "Money",
      about: { "@type": "Person", name: "Robby Hoffman", url: "https://x/p/robby" },
    });
  });
  it("emits sameAs array", () => {
    const e = buildEntity(
      {
        frontmatter: {
          type: "person",
          title: "Alice",
          sameAs: ["https://wikipedia.org/wiki/Alice", "https://instagram.com/alice"],
        },
        slug: "p/alice",
      },
      base,
      baseOpts,
    );
    expect(e!.sameAs).toEqual(["https://wikipedia.org/wiki/Alice", "https://instagram.com/alice"]);
  });
  it("emits image from og-image default", () => {
    const e = buildEntity(
      { frontmatter: { type: "person", title: "Alice" }, slug: "p/alice" },
      base,
      baseOpts,
    );
    expect(e!.image).toBe("https://example.com/p/alice-og-image.webp");
  });
  it("emits dates from frontmatter", () => {
    const e = buildEntity(
      {
        frontmatter: {
          type: "theme",
          title: "Money",
          datePublished: "2026-01-01",
          dateModified: "2026-05-01",
        },
        slug: "themes/money",
      },
      base,
      baseOpts,
    );
    expect(e).toMatchObject({ datePublished: "2026-01-01", dateModified: "2026-05-01" });
  });
});

describe("buildWebSite", () => {
  it("emits a WebSite block", () => {
    expect(buildWebSite("example.com", "My Site", "A description")).toEqual({
      "@type": "WebSite",
      name: "My Site",
      url: "https://example.com/",
      description: "A description",
    });
  });
});

describe("composeBlocks", () => {
  it("emits WebSite on homepage", () => {
    const blocks = composeBlocks(
      { slug: "", frontmatter: { description: "home" } },
      "example.com",
      "Site",
      baseOpts,
    );
    expect(blocks.length).toBe(1);
    expect(blocks[0]!["@type"]).toBe("WebSite");
  });
  it("emits entity + breadcrumbs on a subpage", () => {
    const blocks = composeBlocks(
      { slug: "people/alice", frontmatter: { type: "person", title: "Alice" } },
      "example.com",
      "Site",
      baseOpts,
    );
    expect(blocks.length).toBe(2);
    expect(blocks[0]!["@type"]).toBe("Person");
    expect(blocks[1]!["@type"]).toBe("BreadcrumbList");
  });
  it("includes Organization on homepage when publisher is set", () => {
    const opts = { ...baseOpts, publisher: { name: "Acme" } };
    const blocks = composeBlocks(
      { slug: "", frontmatter: { description: "home" } },
      "example.com",
      "Site",
      opts,
    );
    expect(blocks.length).toBe(2);
    expect(blocks.find((b) => b["@type"] === "Organization")).toBeTruthy();
  });
  it("attaches publisher to Article blocks", () => {
    const opts = { ...baseOpts, publisher: { name: "Acme", url: "https://acme.com" } };
    const blocks = composeBlocks(
      { slug: "themes/money", frontmatter: { type: "theme", title: "Money" } },
      "example.com",
      "Site",
      opts,
    );
    const article = blocks.find((b) => b["@type"] === "Article")!;
    expect(article.publisher).toMatchObject({ "@type": "Organization", name: "Acme" });
  });
});

describe("wrapBlocks", () => {
  it("returns empty for empty input", () => {
    expect(wrapBlocks([], true)).toEqual([]);
  });
  it("returns one @graph envelope when useGraph=true", () => {
    const wrapped = wrapBlocks(
      [
        { "@type": "Person", name: "X" },
        { "@type": "BreadcrumbList", itemListElement: [] },
      ],
      true,
    );
    expect(wrapped.length).toBe(1);
    expect(wrapped[0]!["@context"]).toBe("https://schema.org");
    expect((wrapped[0]!["@graph"] as unknown[]).length).toBe(2);
  });
  it("emits one block per entry when useGraph=false", () => {
    const wrapped = wrapBlocks(
      [
        { "@type": "Person", name: "X" },
        { "@type": "BreadcrumbList", itemListElement: [] },
      ],
      false,
    );
    expect(wrapped.length).toBe(2);
    expect(wrapped[0]!["@context"]).toBe("https://schema.org");
    expect(wrapped[1]!["@context"]).toBe("https://schema.org");
  });
});

describe("safeJsonStringify", () => {
  it("escapes < to unicode (script-tag breakout guard)", () => {
    const out = safeJsonStringify({ x: "</script><script>alert('XSS')</script>" });
    // Only `<` is escaped — that alone is enough to prevent script-tag close.
    // `>` is left as-is (it's not dangerous on its own).
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<script>");
    expect(out).toContain("\\u003c/script>");
    expect(out).toContain("\\u003cscript>");
  });
  it("produces valid JSON that round-trips through parse", () => {
    const obj = { "@type": "Person", name: "Alice <Bob>" };
    const out = safeJsonStringify(obj);
    expect(JSON.parse(out)).toEqual(obj);
  });
});
