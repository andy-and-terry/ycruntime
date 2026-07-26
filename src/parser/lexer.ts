/**
 * Lexer for .yca metadata blocks.
 *
 * Only tokenizes the *metadata* block grammar: `{ ident=value, ... }`.
 * The content block's raw HTML string is NOT tokenized here — the parser
 * grabs it as a raw slice (see parser.ts), since it isn't meant to be
 * "code", just embedded markup.
 */

export type TokenType =
  | "LBRACE"
  | "RBRACE"
  | "IDENT"
  | "EQUALS"
  | "COMMA"
  | "STRING"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  /** 1-based line number, for error messages / popups later. */
  line: number;
  col: number;
}

export class Lexer {
  private pos = 0;
  private line = 1;
  private col = 1;

  constructor(private readonly source: string) {}

  private peek(offset = 0): string | undefined {
    return this.source[this.pos + offset];
  }

  private advance(): string {
    const ch = this.source[this.pos++];
    if (ch === "\n") {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return ch;
  }

  private skipWhitespaceAndCommas(): void {
    // TODO: decide whether commas between metadata entries are required,
    // optional, or should error if missing. The example file has one
    // missing comma (`appname="example",` then `bypassCORS="true"` with
    // no comma before it) — right now we're lenient and just skip commas
    // as whitespace. Tighten this once the real grammar is confirmed.
    while (this.peek() !== undefined && /[\s,]/.test(this.peek()!)) {
      this.advance();
    }
  }

  /** Tokenize just enough to parse one metadata block: `{ ... }`. */
  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.source.length) {
      this.skipWhitespaceAndCommas();
      if (this.pos >= this.source.length) break;

      const startLine = this.line;
      const startCol = this.col;
      const ch = this.peek()!;

      if (ch === "{") {
        this.advance();
        tokens.push({ type: "LBRACE", value: "{", line: startLine, col: startCol });
      } else if (ch === "}") {
        this.advance();
        tokens.push({ type: "RBRACE", value: "}", line: startLine, col: startCol });
      } else if (ch === "=") {
        this.advance();
        tokens.push({ type: "EQUALS", value: "=", line: startLine, col: startCol });
      } else if (ch === '"') {
        tokens.push(this.readString(startLine, startCol));
      } else if (/[A-Za-z_]/.test(ch)) {
        tokens.push(this.readIdent(startLine, startCol));
      } else {
        // TODO: raise a proper YcParseError here instead of throwing raw
        throw new Error(`Unexpected character '${ch}' at line ${startLine}, col ${startCol}`);
      }
    }

    tokens.push({ type: "EOF", value: "", line: this.line, col: this.col });
    return tokens;
  }

  private readIdent(line: number, col: number): Token {
    let value = "";
    while (this.peek() !== undefined && /[A-Za-z0-9_]/.test(this.peek()!)) {
      value += this.advance();
    }
    return { type: "IDENT", value, line, col };
  }

  private readString(line: number, col: number): Token {
    this.advance(); // consume opening quote
    let value = "";
    // TODO: handle escape sequences (\", \\, \n, ...). Right now this reads
    // literally until the next unescaped quote, which is fine for simple
    // metadata values like "true" or "example" but will break on anything
    // containing a literal `"`.
    while (this.peek() !== undefined && this.peek() !== '"') {
      value += this.advance();
    }
    if (this.peek() === '"') {
      this.advance(); // consume closing quote
    } else {
      // TODO: raise a proper YcParseError (unterminated string)
      throw new Error(`Unterminated string starting at line ${line}, col ${col}`);
    }
    return { type: "STRING", value, line, col };
  }
}
