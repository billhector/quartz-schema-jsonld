import { createRequire } from 'module';

createRequire(import.meta.url);

// src/schema.ts
var DEFAULT_TYPE_MAP = {
  person: "Person",
  project: "CreativeWork",
  episode: "CreativeWork",
  theme: "Article",
  bit: "Article",
  career: "Article"
};
var titleizeSlug = (slug) => slug.split("-").filter((s2) => s2.length > 0).map((s2) => s2.charAt(0).toUpperCase() + s2.slice(1)).join(" ");
var stripIndex = (slug) => slug.replace(/\/index$/, "").replace(/^index$/, "");
var buildPageUrl = (baseUrl, slug) => {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const stripped = stripIndex(slug);
  return stripped ? `https://${cleanBase}/${stripped}` : `https://${cleanBase}/`;
};
var isHomeSlug = (slug) => !slug || slug === "index" || slug === "/" || slug === "";
var stripWikilink = (value) => value.replace(/^\s*\[\[/, "").replace(/\]\]\s*$/, "").trim();
function asStringArray(value) {
  if (typeof value === "string") return [stripWikilink(value)];
  if (Array.isArray(value)) {
    return value.filter((v2) => typeof v2 === "string").map(stripWikilink);
  }
  return [];
}
function pickString(frontmatter, keys) {
  if (!frontmatter) return void 0;
  for (const key of keys) {
    const value = frontmatter[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return void 0;
}
function pickDate(frontmatter, dates, frontmatterKeys, datesKey) {
  if (frontmatter) {
    for (const key of frontmatterKeys) {
      const v2 = frontmatter[key];
      if (typeof v2 === "string" && v2.length > 0) return v2;
      if (v2 instanceof Date) return v2.toISOString().slice(0, 10);
    }
  }
  if (dates && dates[datesKey] instanceof Date) {
    return dates[datesKey].toISOString().slice(0, 10);
  }
  return void 0;
}
function defaultOgImageUrl(baseUrl, slug) {
  const stripped = stripIndex(slug);
  if (!stripped) return `https://${baseUrl.replace(/\/$/, "")}/static/og-image.png`;
  return `https://${baseUrl.replace(/\/$/, "")}/${stripped}-og-image.webp`;
}
function resolveImageUrl(frontmatter, baseUrl, slug, imageFromOgImage) {
  const socialImage = pickString(frontmatter, ["socialImage"]);
  if (socialImage) {
    if (/^https?:\/\//.test(socialImage)) return socialImage;
    return `https://${baseUrl.replace(/\/$/, "")}/static/${socialImage}`;
  }
  const image = pickString(frontmatter, ["image"]);
  if (image && /^https?:\/\//.test(image)) return image;
  if (imageFromOgImage) return defaultOgImageUrl(baseUrl, slug);
  return void 0;
}
function buildAuthorBlock(authorValue) {
  const names = asStringArray(authorValue);
  if (names.length === 0) return void 0;
  const persons = names.map((name) => ({ "@type": "Person", name }));
  return persons.length === 1 ? persons[0] : persons;
}
function buildPublisherBlock(publisher) {
  if (!publisher || !publisher.name) return void 0;
  const block = {
    "@type": "Organization",
    name: publisher.name
  };
  if (publisher.url) block.url = publisher.url;
  if (publisher.logo) {
    block.logo = { "@type": "ImageObject", url: publisher.logo };
  }
  return block;
}
function buildBreadcrumbList(slug, baseUrl, siteName, folderLabels) {
  const stripped = stripIndex(slug);
  if (!stripped) return null;
  const segments = stripped.split("/").filter((s2) => s2.length > 0);
  if (segments.length === 0) return null;
  const cleanBase = baseUrl.replace(/\/$/, "");
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: siteName,
      item: `https://${cleanBase}/`
    }
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
      item: `https://${cleanBase}/${cumulative}`
    });
  });
  return {
    "@type": "BreadcrumbList",
    itemListElement: items
  };
}
function buildEntity(pageData, baseUrl, opts) {
  const frontmatter = pageData.frontmatter;
  if (!frontmatter) return null;
  if (frontmatter.schemaDisabled === true) return null;
  const explicitType = pickString(frontmatter, ["schemaType"]);
  const rawType = typeof frontmatter.type === "string" ? frontmatter.type.toLowerCase() : "";
  const schemaType = explicitType ?? opts.typeMap[rawType];
  if (!schemaType) return null;
  const slug = pageData.slug ?? "";
  const title = pickString(frontmatter, ["title"]) ?? titleizeSlug(stripIndex(slug).split("/").pop() ?? "");
  const description = pickString(frontmatter, ["description", "socialDescription"]);
  const pageUrl = buildPageUrl(baseUrl, slug);
  const base = {
    "@type": schemaType,
    name: title,
    url: pageUrl
  };
  if (description) base.description = description;
  const image = resolveImageUrl(frontmatter, baseUrl, slug, opts.imageFromOgImage);
  if (image) base.image = image;
  const sameAs = asStringArray(frontmatter.sameAs);
  if (sameAs.length > 0) base.sameAs = sameAs;
  const author = buildAuthorBlock(frontmatter.author);
  if (author !== void 0) base.author = author;
  const datePublished = pickDate(
    frontmatter,
    pageData.dates,
    ["datePublished", "published"],
    "created"
  );
  if (datePublished) base.datePublished = datePublished;
  const dateModified = pickDate(
    frontmatter,
    pageData.dates,
    ["dateModified", "modified"],
    "modified"
  );
  if (dateModified) base.dateModified = dateModified;
  if (schemaType === "Article") {
    base.headline = title;
    if (opts.subjectName) {
      base.about = opts.subjectUrl ? { "@type": "Person", name: opts.subjectName, url: opts.subjectUrl } : { "@type": "Person", name: opts.subjectName };
    }
    const pub = buildPublisherBlock(opts.publisher);
    if (pub) base.publisher = pub;
  }
  return base;
}
function buildWebSite(baseUrl, siteName, description) {
  const obj = {
    "@type": "WebSite",
    name: siteName,
    url: `https://${baseUrl.replace(/\/$/, "")}/`
  };
  if (description) obj.description = description;
  return obj;
}
function resolveTypeMap(userTypeMap, mergeDefaults) {
  return mergeDefaults ? { ...DEFAULT_TYPE_MAP, ...userTypeMap ?? {} } : { ...userTypeMap ?? {} };
}
function composeBlocks(pageData, baseUrl, siteName, opts) {
  const slug = pageData.slug ?? "";
  const isHome = isHomeSlug(slug);
  const blocks = [];
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
function wrapBlocks(blocks, useGraph) {
  if (blocks.length === 0) return [];
  if (useGraph) {
    return [{ "@context": "https://schema.org", "@graph": blocks }];
  }
  return blocks.map((b) => ({ "@context": "https://schema.org", ...b }));
}
var safeJsonStringify = (obj) => JSON.stringify(obj, null, 2).replace(/</g, "\\u003c");
var l;
function k(n2) {
  return n2.children;
}
l = { __e: function(n2, l2, u3, t2) {
  for (var i2, o2, r2; l2 = l2.__; ) if ((i2 = l2.__c) && !i2.__) try {
    if ((o2 = i2.constructor) && null != o2.getDerivedStateFromError && (i2.setState(o2.getDerivedStateFromError(n2)), r2 = i2.__d), null != i2.componentDidCatch && (i2.componentDidCatch(n2, t2 || {}), r2 = i2.__d), r2) return i2.__E = i2;
  } catch (l3) {
    n2 = l3;
  }
  throw n2;
} }, "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout;

// node_modules/preact/jsx-runtime/dist/jsxRuntime.mjs
var f2 = 0;
function u2(e2, t2, n2, o2, i2, u3) {
  t2 || (t2 = {});
  var a2, c2, p2 = t2;
  if ("ref" in p2) for (c2 in p2 = {}, t2) "ref" == c2 ? a2 = t2[c2] : p2[c2] = t2[c2];
  var l2 = { type: e2, props: p2, key: n2, ref: a2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f2, __i: -1, __u: 0, __source: i2, __self: u3 };
  if ("function" == typeof e2 && (a2 = e2.defaultProps)) for (c2 in a2) void 0 === p2[c2] && (p2[c2] = a2[c2]);
  return l.vnode && l.vnode(l2), l2;
}

// src/transformer.tsx
var DEFAULT_BREADCRUMB_LABELS = {};
var defaultOptions = {
  typeMap: DEFAULT_TYPE_MAP,
  mergeDefaults: true,
  enableBreadcrumbs: true,
  enableWebSite: true,
  breadcrumbFolderLabels: DEFAULT_BREADCRUMB_LABELS,
  imageFromOgImage: true,
  useGraph: true
};
var SchemaJsonLd = (userOptions) => {
  const opts = {
    ...defaultOptions,
    ...userOptions,
    typeMap: resolveTypeMap(userOptions?.typeMap, userOptions?.mergeDefaults ?? true),
    mergeDefaults: userOptions?.mergeDefaults ?? true,
    breadcrumbFolderLabels: {
      ...DEFAULT_BREADCRUMB_LABELS,
      ...userOptions?.breadcrumbFolderLabels ?? {}
    }
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
          (pageData) => {
            const blocks = composeBlocks(
              pageData,
              baseUrl,
              siteName,
              opts
            );
            const wrapped = wrapBlocks(blocks, opts.useGraph);
            if (wrapped.length === 0) return null;
            return /* @__PURE__ */ u2(k, { children: wrapped.map((block, idx) => /* @__PURE__ */ u2(
              "script",
              {
                type: "application/ld+json",
                dangerouslySetInnerHTML: { __html: safeJsonStringify(block) }
              },
              `schema-jsonld-${idx}`
            )) });
          }
        ]
      };
    }
  };
};

export { DEFAULT_TYPE_MAP, SchemaJsonLd, buildBreadcrumbList, buildEntity, buildPublisherBlock, buildWebSite, composeBlocks, resolveTypeMap, safeJsonStringify, titleizeSlug, wrapBlocks };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map