export { SchemaJsonLd } from "./transformer";
export type { SchemaJsonLdOptions, SchemaTypeMap, PublisherOptions } from "./types";

// Public re-exports of pure schema builders, useful for testing or custom
// post-processing on top of the plugin.
export {
  DEFAULT_TYPE_MAP,
  buildBreadcrumbList,
  buildEntity,
  buildPublisherBlock,
  buildWebSite,
  composeBlocks,
  resolveTypeMap,
  safeJsonStringify,
  titleizeSlug,
  wrapBlocks,
} from "./schema";

// Re-export shared types from @quartz-community/types
export type {
  QuartzComponent,
  QuartzComponentProps,
  QuartzComponentConstructor,
  QuartzTransformerPlugin,
  QuartzFilterPlugin,
  QuartzEmitterPlugin,
  QuartzPageTypePlugin,
  QuartzPageTypePluginInstance,
  PageMatcher,
  PageGenerator,
  VirtualPage,
} from "@quartz-community/types";
