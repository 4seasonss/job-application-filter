// Remembers which postings you have already looked at, so the board can flag
// what is new since your last visit.
//
// The upstream feed is a rolling two-week window and it is rebuilt wholesale,
// so "new" cannot come from a timestamp: every row shares one createdTime. It
// has to be a diff against what this browser saw last time, keyed on the
// posting's stable id.
//
// A visit is a session, not a page load: reloading (or coming back within
// SESSION_GAP_MS) keeps the same baseline, otherwise every badge would vanish
// the moment you refreshed the page. Only after a real gap does the previous
// visit's board become the new baseline.

const KEY = 'job-filter.seen.v1';
const SESSION_GAP_MS = 30 * 60 * 1000;
// Come back after this long and nearly everything is "new", which is noise.
const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Pure: given what was stored and the ids on the board now, decide which ids
 * count as new and what to store next.
 *
 * `newIds` is null (not an empty set) when there is nothing to compare against
 * yet, so the UI can hide the feature instead of claiming "0 new".
 */
export function resolveSeen(stored, ids, now) {
  let baseline = stored?.baseline ?? null;

  if (stored) {
    const gap = now - stored.lastActive;
    if (gap > STALE_AFTER_MS) baseline = null;
    else if (gap > SESSION_GAP_MS) baseline = stored.current;
  }

  const known = baseline ? new Set(baseline) : null;
  return {
    newIds: known ? new Set(ids.filter((id) => !known.has(id))) : null,
    next: { baseline, current: ids, lastActive: now },
  };
}

export function loadSeen() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function saveSeen(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Blocked storage just means no "new" badges; nothing else depends on it.
  }
}
