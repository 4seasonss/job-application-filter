// GET /api/jobs?cats=swe
//
// Fetches the requested categories upstream, normalizes and enriches them, and
// hands back plain JSON. There is deliberately no cron job and no database: the
// CDN cache below is the sync mechanism. The first request after an hour
// refreshes in the background while everyone else is served instantly, which
// matches an upstream that aggregates hourly and keeps postings live for weeks.

import { fetchAirtableCategory } from '../src/server/airtable.js';
import { enrich } from '../src/lib/enrich.js';
import { AIRTABLE_CATEGORIES, DEFAULT_CATEGORIES } from '../src/config/sources.js';

const ONE_HOUR = 3600;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const requested = (params.get('cats') || DEFAULT_CATEGORIES.join(','))
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c in AIRTABLE_CATEGORIES);

  if (!requested.length) return send(res, 400, { error: 'No valid categories requested' });

  try {
    const batches = await Promise.all(
      requested.map((key) => fetchAirtableCategory(key, AIRTABLE_CATEGORIES[key])),
    );

    const jobs = batches.flat().map((job) => {
      const enriched = enrich(job);
      // Rebuilt in the browser; shipping it would double the payload.
      delete enriched.searchText;
      return enriched;
    });

    res.setHeader(
      'cache-control',
      `public, s-maxage=${ONE_HOUR}, stale-while-revalidate=${ONE_HOUR * 24}`,
    );
    send(res, 200, { fetchedAt: new Date().toISOString(), categories: requested, jobs });
  } catch (error) {
    // Upstream is an undocumented endpoint, so treat a failure as expected and
    // let the client fall back to whatever it already has.
    send(res, 502, { error: `Upstream fetch failed: ${error.message}` });
  }
}
