import { Lexer, Token } from "./lexer.js";
import type { YcaFile, YcaMetadata } from "./ast.js";

/**
 * Parses a .yca source string into { metadata, content }.
 *
 * Structure (see ast.ts for the ASSUMPTION this is based on):
 *   {
 *     { <metadata k=v pairs> },
 *     { "<raw html>" }
 *   }
 */
export function parseYca(source: string): YcaFile {
  const [metaBlockSrc, contentBlockSrc] = splitTopLevelBlocks(source);
  const metadata = parseMetadataBlock(metaBlockSrc);
  const content = extractContentBlock(contentBlockSrc);
  return { metadata, content };
}

/**
 * Splits `{ block1 , block2 }` into its two top-level `{ ... }` chunks by
 * tracking brace depth (so nested braces inside the HTML content, if any,
 * don't confuse the split).
 *
 * TODO: this currently hard-assumes exactly two top-level blocks. Decide
 * whether a .yca file could ever have more (e.g. an "assets" block) and
 * generalize to return N blocks if so.
 */
function splitTopLevelBlocks(source: string): [string, string] {
  const trimmed = source.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    // TODO: raise a proper YcParseError instead of throwing raw
    throw new Error("Expected .yca file to start and end with braces");
  }
  const inner = trimmed.slice(1, -1);

  const blocks: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of inner) {
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 0 && ch === ",") {
      blocks.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim().length > 0) blocks.push(current);

  if (blocks.length !== 2) {
    // TODO: better error message pointing at line numbers
    throw new Error(`Expected exactly 2 top-level blocks, found ${blocks.length}`);
  }
  return [blocks[0].trim(), blocks[1].trim()];
}

function parseMetadataBlock(blockSrc: string): YcaMetadata {
  const tokens = new Lexer(blockSrc).tokenize();
  let i = 0;

  const expect = (type: Token["type"]): Token => {
    const tok = tokens[i];
    if (tok.type !== type) {
      // TODO: raise a proper YcParseError with line/col
      throw new Error(`Expected ${type} but got ${tok.type} at line ${tok.line}`);
    }
    i++;
    return tok;
  };

  expect("LBRACE");
  const metadata: YcaMetadata = {};

  while (tokens[i].type !== "RBRACE") {
    const key = expect("IDENT").value;
    expect("EQUALS");
    const rawValue = expect("STRING").value;

    // TODO: type coercion policy. Right now "true"/"false" become booleans
    // and everything else stays a string. Decide if numbers should coerce
    // too, and whether this should be explicit in the grammar instead of
    // inferred from the string content.
    metadata[key] = rawValue === "true" ? true : rawValue === "false" ? false : rawValue;
  }
  expect("RBRACE");

  return metadata;
}

function extractContentBlock(blockSrc: string): string {
  if (!blockSrc.startsWith("{") || !blockSrc.endsWith("}")) {
    throw new Error("Expected content block to be wrapped in braces");
  }
  const inner = blockSrc.slice(1, -1).trim();

  // ASSUMPTION: the content block is a single quoted "block string" —
  // opening `"` on its own, then raw lines, then closing `"` on its own.
  // No escaping inside. Confirm this is really the intended grammar
  // (vs. e.g. a JSON-style escaped string) before relying on it further.
  const firstQuote = inner.indexOf('"');
  const lastQuote = inner.lastIndexOf('"');
  if (firstQuote === -1 || lastQuote === firstQuote) {
    throw new Error("Expected content block to contain a quoted raw string");
  }

  const raw = inner.slice(firstQuote + 1, lastQuote);
  // TODO: decide on indentation handling. Right now we naively dedent by
  // stripping the common leading whitespace, but this hasn't been
  // validated against the real spec.
  return dedent(raw);
}

function dedent(text: string): string {
  const lines = text.split("\n").filter((l, idx, arr) => !(idx === 0 && l.trim() === "") && !(idx === arr.length - 1 && l.trim() === ""));
  const indents = lines.filter((l) => l.trim().length > 0).map((l) => l.match(/^\s*/)![0].length);
  const minIndent = indents.length > 0 ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(minIndent)).join("\n");
}
