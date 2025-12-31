const TAGS_TO_DEDUP = ["i", "b", "em", "strong"] as const;

/**
 * Cleans up HTML produced by `wtf-plugin-html`.
 *
 * @remarks
 * `wtf-plugin-html` sometimes emits redundant nested formatting tags like
 * `<i><i><i>text</i></i></i>`. This collapses those to a single tag.
 */
export function cleanupWtfHtml(html: string): string {
  let out = html;
  for (const tag of TAGS_TO_DEDUP) {
    out = collapseRedundantNesting(out, tag);
  }
  return out;
}

/**
 * Collapses redundant nested tags for a single tag name.
 *
 * @example
 * Input: `<i><i>text</i></i>` -> Output: `<i>text</i>`
 */
function collapseRedundantNesting(html: string, tag: string): string {
  // Repeatedly collapse:
  //   <tag>\s*<tag>  -> <tag>
  //   </tag>\s*</tag> -> </tag>
  // until stable.
  let out = html;
  for (let i = 0; i < 10; i++) {
    const before = out;
    out = out
      .replace(new RegExp(`<${tag}>\\s*<${tag}>`, "g"), `<${tag}>`)
      .replace(new RegExp(`</${tag}>\\s*</${tag}>`, "g"), `</${tag}>`);
    if (out === before) break;
  }
  return out;
}
