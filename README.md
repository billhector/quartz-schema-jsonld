# quartz-schema-jsonld

A [Quartz v5](https://quartz.jzhao.xyz) plugin that emits **schema.org JSON-LD** structured data into every page's `<head>`. One `<script type="application/ld+json">` block per page (plus a `BreadcrumbList`), driven by each page's frontmatter `type:` field.

Drop-in: no markdown changes, no theme changes, no template overrides. Add it to `quartz.config.yaml`, set a `typeMap`, done.

## Origin / context

This plugin was originally built for **[robbylore.org](https://robbylore.org)**, a fan-built encyclopedia about the stand-up comedian Robby Hoffman. That vault organizes content into the [LLM-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) shape — every page declares one of these frontmatter `type:` values:

| Frontmatter `type:` | Used for                                          | Default schema.org `@type` |
| ------------------- | ------------------------------------------------- | -------------------------- |
| `person`            | individuals (the subject, family, collaborators)  | `Person`                   |
| `project`           | TV shows, podcasts, specials, films, tours        | `CreativeWork`             |
| `episode`           | specific episodes of podcasts/shows               | `CreativeWork`             |
| `theme`             | recurring topics ("money," "queerness," "family") | `Article`                  |
| `bit`               | recurring jokes / signature comedic material      | `Article`                  |
| `career`            | timeline milestones, awards, controversies        | `Article`                  |

The `bit` entry is the giveaway: this defaults set is comedy-fan-wiki-shaped. **If your vault uses a different vocabulary, override `typeMap` (see below).** The plugin is fully generic — `bit` is just the default that ships, not a baked-in assumption.

## What you get

For every published page, one consolidated `<script type="application/ld+json">` block (using a `@graph` envelope) containing:

- **A primary entity block** whose `@type` comes from either (a) frontmatter `schemaType:` (explicit override), or (b) `typeMap[frontmatter.type]` (default path). Pages with no match get no entity block — just breadcrumbs.
- **A `BreadcrumbList` block** derived from the slug path. `/people/robby-hoffman` → `Home › People › Robby Hoffman`. Disable via `enableBreadcrumbs: false`.
- **A `WebSite` block** on the homepage only. Disable via `enableWebSite: false`.
- **A standalone `Organization` block** on the homepage if you set the `publisher` option.

Set `useGraph: false` to emit each block in its own `<script>` tag instead.

### Frontmatter fields the plugin reads

| Frontmatter key                                        | Used for                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| `type:`                                                | Primary `@type` lookup via `typeMap`                                     |
| `schemaType:`                                          | Explicit `@type` override (bypasses `typeMap`)                           |
| `schemaDisabled: true`                                 | Skip schema emission on that page                                        |
| `title:`                                               | `name` (and `headline` for Article-shaped)                               |
| `description:` or `socialDescription:`                 | `description`                                                            |
| `image:` (absolute URL) / `socialImage:` (path or URL) | `image`                                                                  |
| `sameAs:` (string array)                               | `sameAs` — useful on `Person` pages for linking Wikipedia/Instagram/etc. |
| `author:` (string or wikilink array)                   | `author` (one or more `Person` objects)                                  |
| `datePublished:` / `published:`                        | `datePublished` (ISO 8601)                                               |
| `dateModified:` / `modified:`                          | `dateModified` (ISO 8601)                                                |

Dates also fall back to `pageData.dates.created` / `pageData.dates.modified` provided by Quartz's `created-modified-date` plugin when frontmatter doesn't specify them.

The plugin also auto-fills `image:` with the path the `quartz-community/og-image` plugin produces by default (`<baseUrl>/<slug>-og-image.webp`). Override per-page with `socialImage:` in frontmatter, or globally disable via `imageFromOgImage: false`.

`Article`-type pages additionally get:

- `headline:` (mirrors `name`)
- `about: { @type: Person, name: subjectName, url?: subjectUrl }` — when the `subjectName` option is set. Useful for fan-wiki / single-subject-encyclopedia sites where every theme/bit/career page is fundamentally about one person.
- `publisher: { @type: Organization, ... }` — when the `publisher` option is set.

JSON-LD is escaped to prevent script-tag breakout from frontmatter values containing `</script>` or `<!--` sequences. Validates cleanly against [Google's Rich Results Test](https://search.google.com/test/rich-results) and [schema.org validator](https://validator.schema.org/).

## Install

```yaml
# quartz.config.yaml
plugins:
  - source: github:billhector/quartz-schema-jsonld
    enabled: true
    order: 80
    options:
      # All options optional; defaults shown.
      # See the "typeMap" section below for examples of customizing this.
      enableBreadcrumbs: true
      enableWebSite: true
      mergeDefaults: true
      typeMap: {}
      breadcrumbFolderLabels: {}
      # subjectName: "Your Subject Name"
      # subjectUrl: "https://example.com/people/your-subject-slug"
```

Then:

```
npx quartz plugin add github:billhector/quartz-schema-jsonld
```

## Mapping frontmatter `type:` to schema.org `@type`

The plugin's central knob is `typeMap` — a flat object that maps lowercase frontmatter `type:` values to schema.org `@type` strings. By default your map is **merged with** the built-in defaults, so you only have to specify additions or overrides:

### Adding new mappings (merge with defaults)

```yaml
options:
  typeMap:
    recipe: Recipe # appears alongside the defaults
    event: Event
```

Now any page with `type: recipe` in frontmatter emits a `Recipe` schema, and `event` emits an `Event`. The original defaults (`person → Person`, etc.) still apply for other pages.

### Overriding a default mapping

```yaml
options:
  typeMap:
    bit: HowTo # override: bits now emit HowTo instead of Article
```

### Replacing the defaults entirely

If the bundled defaults are noise for your vault, drop them by setting `mergeDefaults: false`:

```yaml
options:
  mergeDefaults: false
  typeMap:
    article: Article
    page: WebPage
    person: Person
```

With `mergeDefaults: false` the plugin uses ONLY the keys you provide; nothing inherited from the defaults.

### Which schema.org `@type` should I pick?

Use whichever [schema.org type](https://schema.org/docs/full.html) best matches the page. Common picks:

- People → `Person`
- Articles / blog posts / theme pages → `Article`, `BlogPosting`, `NewsArticle`
- Recipes → `Recipe`
- Products → `Product`
- TV shows / films / specials → `CreativeWork`, `TVSeries`, `Movie`, `PodcastSeries`
- Events → `Event`
- Organizations → `Organization`, `LocalBusiness`
- Generic landing pages → `WebPage`, `CollectionPage`

If you pick a sub-type Google specifically supports for rich results (e.g. `Recipe`, `Event`, `Product`), you may also need to add extra frontmatter fields to satisfy that sub-type's required properties. The plugin only emits the basics (`name`, `url`, `description`); it does not infer cuisine, prices, dates, etc. PRs welcome.

## All options

| Option                   | Type                     | Default              | Description                                                                                                                                        |
| ------------------------ | ------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typeMap`                | `Record<string, string>` | (see Origin/context) | Lowercase frontmatter `type:` → schema.org `@type`.                                                                                                |
| `mergeDefaults`          | `boolean`                | `true`               | Merge your `typeMap` with the built-in defaults. Set to `false` to use ONLY your `typeMap`.                                                        |
| `enableBreadcrumbs`      | `boolean`                | `true`               | Emit `BreadcrumbList` JSON-LD on every non-home page.                                                                                              |
| `enableWebSite`          | `boolean`                | `true`               | Emit `WebSite` JSON-LD on the homepage.                                                                                                            |
| `subjectName`            | `string`                 | _(undefined)_        | If set, `Article`-type pages emit `about: { @type: Person, name: subjectName }`.                                                                   |
| `subjectUrl`             | `string`                 | _(undefined)_        | If `subjectName` is set, this becomes the `about.url`.                                                                                             |
| `publisher`              | `{ name; url?; logo? }`  | _(undefined)_        | If set, every `Article` page gets a `publisher: Organization` field, and the homepage emits a standalone `Organization` block.                     |
| `imageFromOgImage`       | `boolean`                | `true`               | Auto-fill the `image` field using the path emitted by the `quartz-community/og-image` plugin. Per-page `socialImage:` frontmatter still overrides. |
| `useGraph`               | `boolean`                | `true`               | Consolidate all per-page blocks into one `<script>` using `@graph`. Set to `false` to emit one `<script>` per block.                               |
| `breadcrumbFolderLabels` | `Record<string, string>` | `{}`                 | Override Title-Case slug labels in breadcrumbs (e.g. `{ "wp-feature-planning": "WP Feature Planning" }`).                                          |

## Verifying

After building, view the source of any page on the live site. You should see one or more `<script type="application/ld+json">` blocks inside `<head>`. Paste the JSON content into [Google's Rich Results Test](https://search.google.com/test/rich-results) or the [schema.org validator](https://validator.schema.org/) to confirm validity.

## How it works

The plugin registers a single Quartz transformer (`SchemaJsonLd`) whose `externalResources(ctx)` returns an `additionalHead` entry — a function that Quartz's `Head` component invokes per page at render time with the page's `QuartzPluginData`. The function reads `pageData.frontmatter`, `pageData.slug`, and the configured `baseUrl` / `pageTitle`, builds the appropriate schema.org objects, and returns a Preact fragment of `<script type="application/ld+json">` tags.

The transformer does **not** touch markdown or HTML — only adds head resources. A no-op `markdownPlugins() => []` is provided solely to satisfy Quartz's transformer-category validation, which requires a transformer instance to expose at least one of `textTransform` / `markdownPlugins` / `htmlPlugins`.

JSON-LD content is escaped via `JSON.stringify` plus a `<` → `<` replacement to prevent script-tag breakout from frontmatter values containing literal `</script>` or `<!--` sequences. Consumers like Google still receive the original characters because `JSON.parse` reconstructs them client-side.

## Contributing

Issues + PRs welcome. The default `typeMap` is intentionally minimal — feel free to propose additions, but the design preference is to keep the defaults small and trust users to add their own vocabulary via `typeMap` overrides.

## License

[MIT](./LICENSE). See `LICENSE` for full text.
