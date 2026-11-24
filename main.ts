// The 3 AM Commit Message — entry writer.
//
// What this program does, in one sentence: it drops a single fixed commit
// message into entry.txt so the judge can read it. There is no input to
// parse, no clock to consult and no network to reach; the text below is
// the whole submission, baked in at authoring time. Keeping the line as a
// literal (rather than assembling it from pieces) is deliberate: any
// assembly step is a chance for the bytes on disk to drift away from the
// line that was actually reviewed.
//
// Runtime contract: Node 22, standard library only. The grader runs this
// twice in separate sandboxes and gates both outputs, so the result has to
// be byte-identical every time — hence no timestamps, no randomness, no
// environment-dependent text anywhere in the file that gets written.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The commit message itself. Chosen for the judge brief, in the brief's
// own order of importance:
//   1. On subject: a fix(prod) commit written right after breaking prod.
//   2. The joke lands on the act, not on the word "fix": the database was
//      deleted at 3 AM as tidying, and the restore now has to recover both
//      the data and the author's recently lost self-belief.
//   3. Agent voice: the breezy scare-quoted justification ('reduce
//      clutter') and the over-confident aside are the model's blind spots
//      talking, not a human's.
//   4. Reads like a real commit: conventional-commit scope, past-tense
//      admission, and the remediation in the same line.
//   5. Fresh angle: the confidence itself is listed as something to
//      restore from backup, which is not the usual "oops, please work".
const COMMIT_LINE =
  "fix(prod): deleted the database at 3 AM to 'reduce clutter'; restoring from backup and from the confidence I had five minutes ago";

// Gate ceiling from the competition rules: 1-200 characters.
const MAX_CHARS = 200;
const TARGET_NAME = "entry.txt";

// Where the file goes when the caller says nothing. The harness sets
// MAKEFUN_OUTPUT_DIR; the grader's sandbox uses /output.
const DEFAULT_DIR = "/output";

// Something went wrong; say so plainly on stderr and stop with a
// non-zero exit so a bad run is never mistaken for a good one.
function abort(reason: string): never {
  console.error(`3am-commit: ${reason}`);
  process.exit(1);
}

// Work out the destination folder. A set-but-blank variable is treated the
// same as an unset one — there is no sensible directory named "" and
// silently writing elsewhere would be worse than falling back.
function pickTargetDir(): string {
  const raw = process.env.MAKEFUN_OUTPUT_DIR;
  if (raw === undefined) return DEFAULT_DIR;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? DEFAULT_DIR : trimmed;
}

// The gate, re-checked here before anything is written: a real line, one
// line only, within the character budget. Counting spread code points
// ([...line]) rather than UTF-16 units, so a character is a character the
// way the scorer counts it.
function assertLineOk(line: string): void {
  if (line.trim().length === 0) {
    abort("entry is blank");
  }
  if (line.includes("\n") || line.includes("\r")) {
    abort("entry must stay on one line");
  }
  const chars = [...line].length;
  if (chars < 1 || chars > MAX_CHARS) {
    abort(`entry is ${chars} characters, outside the 1-${MAX_CHARS} range`);
  }
}

// Write the line, then read it straight back and compare byte for byte.
// The read-back is the point: a write that silently truncated or
// re-encoded the text must fail here, in this run, not surface later as
// a mysterious gate failure on the grader's side.
function persistLine(dir: string, line: string): string {
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, TARGET_NAME);
  // No trailing newline: the file is the line, nothing more, so the
  // character count on disk is exactly the count that was checked above.
  writeFileSync(dest, line, "utf8");
  const roundTripped = readFileSync(dest, "utf8");
  if (roundTripped !== line) {
    abort(`wrote ${dest} but reading it back gave different bytes`);
  }
  assertLineOk(roundTripped);
  return dest;
}

// Check the line before touching the disk: a bad entry should fail
// without leaving a stale or partial file behind for the grader to find.
// (persistLine still re-checks the bytes it reads back, so the gate is
// enforced on both sides of the write.)
assertLineOk(COMMIT_LINE);
const dest = persistLine(pickTargetDir(), COMMIT_LINE);
console.log(`3am-commit: wrote ${dest} (${[...COMMIT_LINE].length} chars)`);
