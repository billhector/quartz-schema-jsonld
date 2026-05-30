# quartz-schema-jsonld

A [Quartz v5](https://quartz.jzhao.xyz) plugin that emits **schema.org JSON-LD** structured data into every page's `<head>` based on each page's frontmatter `type:` field. Includes per-page `BreadcrumbList` derived from the slug path and a site-wide `WebSite` block on the homepage.

Drop-in plugin: no markdown changes, no theme changes, no template overrides. Just enable it in `quartz.config.yaml`.

## What you get

For every page with `type: <something>` in frontmatter, the plugin emits an `application/ld+json` script tag with the appropriate schema.org `@type`:

| Frontmatter `type:` | schema.org `@type` |
|---|---|
| `person` | `Person` |
| `project` | `CreativeWork` |
| `episode` | `CreativeWork` |
| `theme` | `Article` |
| `bit` | `Article` |
| `career` | `Article` |
| *(anything else / unmapped)* | *(no entity emitted, only BreadcrumbList)* |

Override the mapping with the `typeMap` option for any other vault vocabulary.

Plus:

- **`BreadcrumbList`** on every non-home page, derived from the slug path. `/people/robby-hoffman` → `Home › People › Robby Hoffman`.
- **`WebSite`** block on the homepage with `name`, `url`, `description`.
- **`about: Person`** field added to `Article`-type pages when you set the `subjectName` option — useful for fan-wiki-style sites where every theme/bit/career page is about a single subject.

## Install

```yaml
# quartz.config.yaml
plugins:
  - source: github:billhector/quartz-schema-jsonld
    enabled: true
    order: 80
    options:
      # All options are optional. Defaults shown.
      enableBreadcrumbs: true
      enableWebSite: true
      typeMap:
        person: Person
        project: CreativeWork
        episode: CreativeWork
        theme: Article
        bit: Article
        career: Article
      breadcrumbFolderLabels: {}
      # Optional: if every Article-type page is about a single subject, set this
      # and the plugin will add `about: { @type: Person, name: ... }` to each.
      # subjectName: "Robby Hoffman"
      # subjectUrl: "https://robbylore.org/people/robby-hoffman"
```

Then `npx quartz plugin install` to fetch.

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `typeMap` | `Record<string, string>` | See above | Frontmatter `type:` → schema.org `@type` mapping. Lowercase keys. Merged with defaults — you don't need to repeat the standard set. |
| `enableBreadcrumbs` | `boolean` | `true` | Emit `BreadcrumbList` JSON-LD on every non-home page. |
| `enableWebSite` | `boolean` | `true` | Emit `WebSite` JSON-LD on the homepage. |
| `subjectName` | `string` | *(undefined)* | If set, `Article`-type pages emit `about: { @type: Person, name: subjectName }`. |
| `subjectUrl` | `string` | *(undefined)* | If `subjectName` is set, this becomes the `about.url`. |
| `breadcrumbFolderLabels` | `Record<string, string>` | `{}` | Override Title-Case slug labels in breadcrumbs (e.g. `{ "wp-feature-planning": "WP Feature Planning" }`). |

## Verifying

After building, view the source of any page on the live site. You should see one or more `<script type="application/ld+json">` blocks inside `<head>`. Paste the JSON content into [Google's Rich Results Test](https://search.google.com/test/rich-results) or the [schema.org validator](https://validator.schema.org/) to confirm validity.

## How it works

The plugin registers a single Quartz transformer (`SchemaJsonLd`) whose `externalResources(ctx)` returns an `additionalHead` entry — a function that Quartz's `Head` component invokes per page at render time with the page's `QuartzPluginData`. The function reads `pageData.frontmatter`, `pageData.slug`, and the configured `baseUrl` / `pageTitle`, builds the appropriate schema.org objects, and returns a Preact fragment of `<script type="application/ld+json">` tags.

The transformer does **not** touch markdown or HTML — only adds head resources.

JSON-LD content is escaped via `JSON.stringify` plus a `<` → `<` replacement to prevent script-tag breakout from frontmatter values containing literal `</script>` or `<!--` sequences. Consumers like Google still receive the original characters because `JSON.parse` reconstructs them client-side.

## License

MIT. © Bill Hector.
