/**
 * AST for the .yca format (v0.1.0).
 *
 * ASSUMPTION (confirm with spec author): a .yca file is exactly two blocks
 * wrapped in an outer `{ ... }`:
 *   1. a metadata block   { key="value", key="value" }
 *   2. a content block    { "  ...raw html...  " }
 * Order is fixed: metadata first, content second. If that's wrong, this
 * is the file to change.
 */

export interface YcaMetadata {
  appname?: string;
  bypassCORS?: boolean;
  // TODO: add more metadata keys here as the spec grows
  // (e.g. width/height for the window, icon path, version, entry point...)
  [key: string]: string | boolean | undefined;
}

export interface YcaFile {
  metadata: YcaMetadata;
  /** Raw HTML payload to be served/rendered. */
  content: string;
}
