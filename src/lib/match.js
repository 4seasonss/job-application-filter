// Boundary-aware keyword matching.
//
// Plain substring matching is wrong in ways that quietly corrupt scoring:
// "java" matches JavaScript, "rust" matches trust, "css" matches SCSS, and
// "sql" matches PostgreSQL. Every one of those inflates a lane the candidate
// or posting has nothing to do with.
//
// Terms ending in '*' are prefix stems, so 'containeriz*' covers containerize,
// containerized and containerization.

const cache = new Map();

function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compile(term) {
  const isStem = term.endsWith('*');
  const body = (isStem ? term.slice(0, -1) : term).trim();

  // A leading boundary only means something when the term starts with an
  // alphanumeric; '.net' or '+1' need no guard in front.
  const lead = /^[a-z0-9]/i.test(body) ? '(?:^|[^a-z0-9])' : '';
  // Likewise a trailing guard only applies when the term ends alphanumeric, so
  // 'c++' still matches inside 'c++11' and 'c/c++'. A stem deliberately has
  // none, and instead swallows the rest of the word so we can show it.
  const tail = isStem ? '[a-z]*' : /[a-z0-9]$/i.test(body) ? '(?![a-z0-9])' : '';

  // The body is captured so callers can recover the text that actually matched
  // rather than the pattern — 'containeriz*' should read back "containerized".
  return new RegExp(`${lead}(${escape(body)}${tail})`, 'i');
}

function regexFor(term) {
  let regex = cache.get(term);
  if (!regex) {
    regex = compile(term);
    cache.set(term, regex);
  }
  return regex;
}

/** Compiled once per term and reused — scoring runs this tens of thousands of times. */
export function matchesTerm(haystack, term) {
  return regexFor(term).test(haystack);
}

/** The text that matched, for display, or null. */
export function findTerm(haystack, term) {
  return regexFor(term).exec(haystack)?.[1] ?? null;
}
