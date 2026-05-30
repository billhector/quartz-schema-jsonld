import { createRequire } from 'module';

createRequire(import.meta.url);
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
var DEFAULT_TYPE_MAP = {
  person: "Person",
  project: "CreativeWork",
  episode: "CreativeWork",
  theme: "Article",
  bit: "Article",
  career: "Article"
};
var DEFAULT_BREADCRUMB_LABELS = {};
var defaultOptions = {
  typeMap: DEFAULT_TYPE_MAP,
  mergeDefaults: true,
  enableBreadcrumbs: true,
  enableWebSite: true,
  breadcrumbFolderLabels: DEFAULT_BREADCRUMB_LABELS
};
var titleizeSlug = (slug) => slug.split("-").filter((s2) => s2.length > 0).map((s2) => s2.charAt(0).toUpperCase() + s2.slice(1)).join(" ");
var stripIndex = (slug) => slug.replace(/\/index$/, "").replace(/^index$/, "");
var buildUrl = (baseUrl, slug) => {
  const stripped = stripIndex(slug);
  const path = stripped ? `/${stripped}` : "/";
  return `https://${baseUrl.replace(/\/$/, "")}${path}`;
};
function buildBreadcrumbList(slug, baseUrl, siteName, folderLabels) {
  const stripped = stripIndex(slug);
  if (!stripped) return null;
  const segments = stripped.split("/").filter((s2) => s2.length > 0);
  if (segments.length === 0) return null;
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: siteName,
      item: `https://${baseUrl.replace(/\/$/, "")}/`
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
      item: `https://${baseUrl.replace(/\/$/, "")}/${cumulative}`
    });
  });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
  };
}
function buildEntity(frontmatter, slug, baseUrl, opts) {
  if (!frontmatter) return null;
  const rawType = typeof frontmatter.type === "string" ? frontmatter.type.toLowerCase() : "";
  const schemaType = opts.typeMap[rawType];
  if (!schemaType) return null;
  const title = typeof frontmatter.title === "string" && frontmatter.title.length > 0 ? frontmatter.title : titleizeSlug(stripIndex(slug).split("/").pop() ?? "");
  const description = typeof frontmatter.description === "string" && frontmatter.description.length > 0 ? frontmatter.description : void 0;
  const pageUrl = buildUrl(baseUrl, slug);
  const base = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: title,
    url: pageUrl
  };
  if (description) {
    base.description = description;
  }
  if (schemaType === "Article" && opts.subjectName) {
    base.headline = title;
    if (opts.subjectUrl) {
      base.about = {
        "@type": "Person",
        name: opts.subjectName,
        url: opts.subjectUrl
      };
    } else {
      base.about = { "@type": "Person", name: opts.subjectName };
    }
  }
  return base;
}
function buildWebSite(baseUrl, siteName, description) {
  const obj = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: `https://${baseUrl.replace(/\/$/, "")}/`
  };
  if (description) obj.description = description;
  return obj;
}
var safeJsonStringify = (obj) => JSON.stringify(obj, null, 2).replace(/</g, "\\u003c");
var SchemaJsonLd = (userOptions) => {
  const mergeDefaults = userOptions?.mergeDefaults ?? true;
  const resolvedTypeMap = mergeDefaults ? { ...DEFAULT_TYPE_MAP, ...userOptions?.typeMap ?? {} } : { ...userOptions?.typeMap ?? {} };
  const opts = {
    ...defaultOptions,
    ...userOptions,
    typeMap: resolvedTypeMap,
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
      if (!baseUrl) {
        return {};
      }
      const siteName = cfg.pageTitle ?? "";
      return {
        additionalHead: [
          (pageData) => {
            const slug = pageData.slug ?? "";
            const frontmatter = pageData.frontmatter;
            const isHome = !slug || slug === "index" || slug === "/";
            const blocks = [];
            if (isHome && opts.enableWebSite) {
              const desc = typeof frontmatter?.description === "string" ? frontmatter.description : void 0;
              blocks.push(buildWebSite(baseUrl, siteName, desc));
            } else {
              const entity = buildEntity(frontmatter, slug, baseUrl, opts);
              if (entity) blocks.push(entity);
              if (opts.enableBreadcrumbs) {
                const crumbs = buildBreadcrumbList(
                  slug,
                  baseUrl,
                  siteName,
                  opts.breadcrumbFolderLabels
                );
                if (crumbs) blocks.push(crumbs);
              }
            }
            if (blocks.length === 0) return null;
            return /* @__PURE__ */ u2(k, { children: blocks.map((block, idx) => /* @__PURE__ */ u2(
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

export { SchemaJsonLd };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map