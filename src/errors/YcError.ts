/**
 * Base error type for anything that goes wrong parsing/running a .yca file.
 *
 * TODO (next step, after parser + VM): this is what will eventually back
 * the "nagware"-style error popup window — something like:
 *
 *   ┌─────────────────────────────────┐
 *   │  ycruntime encountered an error │
 *   │  <error.message>                │
 *   │              [ OK ]             │
 *   └─────────────────────────────────┘
 *
 * Not wired up to any UI yet — just the error shape for now.
 */
export class YcError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "YcError";
  }
}
