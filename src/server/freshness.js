// How old is the newest posting in the feed?
//
// The feed's own Date column is day-only, so on its own it cannot say whether
// the board is minutes or most of a day behind. The job page each Apply link
// opens carries an exact publish time, so we read a handful of the newest rows.
//
// Deliberately small. Reading a page per job would be ~200 requests a refresh,
// and jobright answers rapid automated traffic with a security challenge after
// about 30 of them. Not evading that is a choice, so this stays a few requests,
// spaced by a cache, and treats any failure as "no answer" rather than an error.

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// The feed is newest-first by date but only roughly by time within a day (a row
// six places down was newer than the top one when checked), so look at a few.
const PROBE_ROWS = 10;
const TIMEOUT_MS = 4000;
const MAX_CACHED = 200;

// A posting's publish time never changes, so a successful read is kept for the
// life of the server instance. In steady state only rows that appeared since the
// last refresh cost a request.
const cache = new Map();

async function readPublishedAt(url) {
  try {
    const res = await fetch(url.split('?')[0], {
      headers: { 'user-agent': UA },
      redirect: 'manual', // a challenge is a redirect; do not follow it
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status !== 200) return null;
    const stamp = (await res.text()).match(/"datePosted":"(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)"/)?.[1];
    // The page's clock is UTC: read that way every sampled posting was 0.2-3.4
    // hours old, and a page reading "1 hour ago" carried a stamp ~1h55m back.
    return stamp ? `${stamp.replace(' ', 'T')}Z` : null;
  } catch {
    return null;
  }
}

/** ISO timestamp of the newest posting among the top rows, or null if unknown. */
export async function fetchNewestPosted(jobs) {
  const top = jobs.slice(0, PROBE_ROWS);

  await Promise.all(
    top.map(async (job) => {
      if (cache.has(job.id)) return;
      const publishedAt = await readPublishedAt(job.url);
      if (publishedAt) cache.set(job.id, publishedAt); // never cache a failure
    }),
  );

  while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value);

  const times = top.map((job) => cache.get(job.id)).filter(Boolean).sort();
  return times.at(-1) ?? null;
}
