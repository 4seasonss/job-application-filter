// Derives structured signals from the free-text Qualifications field.
//
// The upstream data has a usable-but-thin schema: it tells you the work model
// and a coarse H1b guess, but not "needs 5 years of experience" or "must be a
// US citizen". Those live in prose, and for an F-1 candidate they matter more
// than the H1b column does — a posting flagged "not sure" that says "must be a
// US citizen" is a hard no, and nothing in the schema catches that.

const CITIZENSHIP_PATTERNS = [
  /\bu\.?\s?s\.?\s+citizen(?:ship)?\b/i,
  /\bmust be a citizen\b/i,
  /\bsecurity clearance\b/i,
  /\btop secret\b/i,
  /\bts\/sci\b/i,
  /\b(?:itar|export control)/i,
  /\bgreen card holder\b/i,
  /\bpermanent resident\b/i,
];

const NO_SPONSORSHIP_PATTERNS = [
  /\b(?:not|unable to|cannot|does not|do not|won'?t)\b[^.]{0,40}\bsponsor/i,
  /\bwithout (?:the need for |any )?(?:visa )?sponsorship\b/i,
  /\bno (?:visa )?sponsorship\b/i,
  /\bsponsorship is not (?:available|offered|provided)\b/i,
  /\bnot eligible for (?:visa )?sponsorship\b/i,
];

// "3+ years", "5 - 7 years", "two years" — but not "2027" or "past 3 years".
const YEARS_RE = /(?:^|[^\d.])(\d{1,2})\s*(?:\+|\s*(?:-|–|to)\s*\d{1,2})?\s*(?:\+\s*)?(?:years?|yrs?)\b/gi;
const YEARS_BACKREF = /\b(?:within|past|last|next|over the)\s*$/i;

function matchesAny(patterns, text) {
  return patterns.some((p) => p.test(text));
}

/**
 * Lowest number of years of experience the posting demands, or 0 if it never
 * asks. We take the minimum because postings routinely list a hard floor and a
 * softer "5+ preferred" — the floor is what actually gates you.
 */
function minYearsRequired(text) {
  let min = null;
  for (const match of text.matchAll(YEARS_RE)) {
    // The match starts a character before the digits, so locate the number
    // itself — slicing to the end of the match would run past it and the
    // anchored guard below could never fire.
    const digitsAt = match.index + match[0].indexOf(match[1]);
    if (YEARS_BACKREF.test(text.slice(Math.max(0, digitsAt - 16), digitsAt))) continue;

    // Only count it if "experience" shows up nearby, otherwise we catch things
    // like "4 year degree" or "2 years of college".
    const window = text.slice(match.index, match.index + 90).toLowerCase();
    if (!window.includes('experience') && !window.includes('exp.')) continue;

    const years = Number(match[1]);
    if (years > 0 && years <= 20 && (min === null || years < min)) min = years;
  }
  return min ?? 0;
}

/** Graduation years the posting names, e.g. "2027 Start" or "graduating in 2026". */
function graduationYears(text) {
  const years = new Set();
  for (const match of text.matchAll(/\b(20(?:2[4-9]|3[0-5]))\b/g)) years.add(Number(match[1]));
  return [...years].sort();
}

/**
 * True when the posting wants a degree strictly above a bachelor's. A mention
 * of a master's alongside a bachelor's is an "or", not a bar, so it doesn't
 * count.
 */
function requiresAdvancedDegree(text) {
  const advanced = /\b(?:master'?s|m\.?s\.?\s+degree|ph\.?\s?d|doctorate)\b/i.test(text);
  const bachelors = /\b(?:bachelor'?s|b\.?s\.?\s+degree|undergraduate degree)\b/i.test(text);
  return advanced && !bachelors;
}

export function enrich(job) {
  const text = `${job.title}\n${job.qualifications}`;
  return {
    ...job,
    minYears: minYearsRequired(text),
    gradYears: graduationYears(text),
    advancedDegree: requiresAdvancedDegree(text),
    // Two distinct reasons a sponsorship-dependent candidate is blocked, kept
    // apart so the UI can explain which one fired.
    requiresCitizenship: matchesAny(CITIZENSHIP_PATTERNS, text),
    refusesSponsorship: matchesAny(NO_SPONSORSHIP_PATTERNS, text),
    searchText: text.toLowerCase(),
  };
}

/**
 * searchText is derived, not transported — recomputing it in the browser keeps
 * the payload from carrying a second lowercased copy of every posting.
 */
export function attachSearchText(job) {
  return { ...job, searchText: `${job.title}\n${job.qualifications}`.toLowerCase() };
}
