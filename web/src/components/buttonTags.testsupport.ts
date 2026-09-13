// ---------------------------------------------------------------------------
// Every `<Button …>` opening tag in the source tree, with its file, its line
// and its raw props.
//
// This lived inside glyphs.hygiene.test.ts and moved out when a second guard
// needed it (glyphFor.reach.test.ts). Two copies would drift, and then the two
// guards would be checking two different trees while both reported green - the
// exact shape of failure that a scanner is worst at admitting, because a scan
// that reads nothing reports perfect coverage of nothing.
//
// It is source text rather than an AST on purpose. The question these guards
// ask is a property of the CODE ("does any call site carry a literal that could
// beat its tone", "does every key a call site can produce resolve to a glyph"),
// not of one rendered state on one page, and a regex over the tree answers it
// in one pass without a parser dependency. The one place that naivety would
// hurt - finding where an opening tag ends - is handled properly below.
// ---------------------------------------------------------------------------
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export type ButtonTag = {
  file: string;
  line: number;
  props: string;
  /** Offset of the tag's own `<` in its file, and of the character after the
   *  `>` that closes the opening tag. A guard that has to know whether two
   *  buttons are really SIBLINGS needs these: "close together in line numbers"
   *  answers yes for two branches of one ternary, which never render together.
   *  What actually separates siblings is that nothing but whitespace lies
   *  between them. */
  start: number;
  end: number;
  /** The file's full text, so a caller can look at what lies between two tags
   *  without reading the file a second time. */
  source: string;
};

/** Every non-test .tsx under `dir`, recursively. */
export function walkTsx(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkTsx(full, out);
    else if (/\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

export function buttonTags(src: string): ButtonTag[] {
  const out: ButtonTag[] = [];
  for (const file of walkTsx(src)) {
    const s = readFileSync(file, "utf8");
    const re = /<Button\b/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s))) {
      // Scan to the '>' that closes the opening tag, ignoring any inside the
      // braces of a prop value - a naive indexOf('>') stops at the first arrow
      // function and reports a fraction of the props.
      let depth = 0;
      let i = re.lastIndex;
      let end = -1;
      for (; i < s.length; i++) {
        const c = s[i];
        if (c === "{") depth++;
        else if (c === "}") depth--;
        else if (c === ">" && depth === 0) {
          end = i;
          break;
        }
      }
      if (end < 0) continue;
      out.push({
        file: file.slice(src.length + 1).replace(/\\/g, "/"),
        line: s.slice(0, m.index).split("\n").length,
        props: s.slice(re.lastIndex, end),
        start: m.index,
        end: end + 1,
        source: s,
      });
    }
  }
  return out;
}
