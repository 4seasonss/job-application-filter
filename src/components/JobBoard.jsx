import { useEffect, useMemo, useState } from 'react';
import FilterPanel from './FilterPanel.jsx';
import JobCard from './JobCard.jsx';
import Flame from './Flame.jsx';
import { rank } from '../lib/scoring.js';
import { isOutside } from '../lib/location.js';

const PAGE_SIZE = 40;
const HOT_PREVIEW = 10;

// "Today" is the Eastern calendar date, formatted YYYY-MM-DD like the feed's own
// dates ('en-CA' gives that shape whatever the viewer's locale).
//
// Worth knowing: the feed's day actually rolls over at midnight *Pacific*
// (checked against exact publish times: 11:58 PM PT is still the old date,
// 12:00 AM PT is the new one). So in Eastern terms the count restarts from 0 at
// midnight but then stays there until 3 AM ET, when the feed starts dating new
// postings to the new day. Postings from those three hours are dated to the
// previous day and are not counted as today.
const TZ = 'America/New_York';
const todayET = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: TZ });

function formatAge(ms) {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m ago`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h ago`;
}

const clockET = (iso) =>
  new Date(iso).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

export default function JobBoard({
  jobs,
  status,
  fetchedAt,
  newestPostedAt,
  config,
  update,
  reset,
  newIds,
}) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [showAllHot, setShowAllHot] = useState(false);
  const [newOnly, setNewOnly] = useState(false);

  const { matches, total, dropped } = useMemo(() => rank(jobs, config), [jobs, config]);

  // How many postings the region toggle is standing between you and, counted
  // across the whole feed so the number doesn't move as other filters change.
  const abroadCount = useMemo(() => jobs.filter((job) => isOutside(job.location)).length, [jobs]);

  // Company names for autocomplete, most frequent first so the ones you are
  // likely to want to hide (the big recruiters) are the first suggestions.
  const companyOptions = useMemo(() => {
    const counts = new Map();
    for (const job of jobs) if (job.company) counts.set(job.company, (counts.get(job.company) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
  }, [jobs]);

  // A clock in state rather than Date.now() in render: it keeps "N min ago"
  // honest on a tab left open, and rolls "today" over at midnight without a
  // refresh.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(tick);
  }, []);

  const today = todayET(now);

  // Counted straight off the feed, before any of your filters. This is the
  // sanity number: it should start near 0 after midnight and climb through the
  // day. If it sits at 0 mid-afternoon, or never moves, the feed is the problem
  // and not your filters.
  const { sourceToday, latestDate } = useMemo(() => {
    let count = 0;
    let latest = '';
    for (const job of jobs) {
      if (job.date === today) count += 1;
      if (job.date > latest) latest = job.date;
    }
    return { sourceToday: count, latestDate: latest };
  }, [jobs, today]);

  const { hot, rest, hotCount, newCount } = useMemo(() => {
    const tagged = matches.map((result) => ({
      result,
      hot: result.job.date === today,
      fresh: newIds ? newIds.has(result.job.id) : false,
    }));
    const pool = newOnly ? tagged.filter((t) => t.fresh) : tagged;
    return {
      hot: pool.filter((t) => t.hot),
      rest: pool.filter((t) => !t.hot),
      hotCount: tagged.filter((t) => t.hot).length,
      newCount: tagged.filter((t) => t.fresh).length,
    };
  }, [matches, newIds, newOnly, today]);

  const change = (patch) => {
    update(patch);
    setVisible(PAGE_SIZE);
  };

  const hideCompany = (name) => {
    if (config.companiesExclude.some((c) => c.toLowerCase() === name.toLowerCase())) return;
    change({ companiesExclude: [...config.companiesExclude, name] });
  };

  const renderCard = ({ result, hot: isHot, fresh }) => (
    <JobCard
      key={result.job.id}
      result={result}
      hot={isHot}
      fresh={fresh}
      onHideCompany={hideCompany}
    />
  );

  const hotShown = showAllHot ? hot : hot.slice(0, HOT_PREVIEW);
  const shown = matches.length === 0 ? 0 : hot.length + rest.length;

  return (
    <>
      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="Search title, company, requirements…"
          value={config.search}
          onChange={(e) => change({ search: e.target.value })}
        />
        <select value={config.sortBy} onChange={(e) => change({ sortBy: e.target.value })}>
          <option value="score">Best match</option>
          <option value="date">Newest</option>
        </select>
        <button
          type="button"
          className={config.usCanadaOnly ? 'chip chip-on' : 'chip'}
          aria-pressed={config.usCanadaOnly}
          onClick={() => change({ usCanadaOnly: !config.usCanadaOnly })}
          title="Hides postings located only outside the US and Canada. A posting that lists the US alongside other countries stays, and so does one with no country given."
        >
          US &amp; Canada only
          {status === 'ready' && <span className="chip-count">{abroadCount} abroad</span>}
        </button>
        <label className="check check-inline">
          <input
            type="checkbox"
            checked={config.hideWeakMatches}
            onChange={(e) => change({ hideWeakMatches: e.target.checked })}
          />
          <span>Skill match only</span>
        </label>
        {newIds && (
          <label className="check check-inline">
            <input
              type="checkbox"
              checked={newOnly}
              onChange={(e) => {
                setNewOnly(e.target.checked);
                setVisible(PAGE_SIZE);
              }}
            />
            <span>New since last visit ({newCount})</span>
          </label>
        )}
      </div>

      <div className="layout">
        <FilterPanel config={config} update={change} reset={reset} companyOptions={companyOptions} />

        <main className="results">
          {status === 'loading' && <p className="notice">Loading postings…</p>}
          {status === 'error' && (
            <p className="notice notice-error">
              Could not reach the job source. It is an undocumented upstream endpoint, so this
              usually means the handshake changed — try again shortly.
            </p>
          )}

          {status === 'ready' && (
            <>
              <div className="summary">
                <strong>
                  {matches.length} of {total}
                </strong>{' '}
                postings match you.
                {fetchedAt && (
                  <span className="synced"> Synced {new Date(fetchedAt).toLocaleString()}.</span>
                )}
                {newestPostedAt && (
                  <span className="today-line">
                    Newest posting: <b>{formatAge(now - Date.parse(newestPostedAt))}</b> (
                    {clockET(newestPostedAt)} ET)
                  </span>
                )}
                <span className="today-line">
                  <b>{sourceToday}</b> posted in the source today (ET, {today})
                  {sourceToday === 0 && latestDate && (
                    <> — the newest posting there is dated {latestDate}</>
                  )}
                  {' · '}
                  <b>{hotCount}</b> match your filters
                  {newIds ? (
                    <>
                      {' · '}
                      <b>{newCount}</b> new since your last visit
                    </>
                  ) : (
                    <> · “new since last visit” starts working from your next visit</>
                  )}
                </span>
                {dropped.length > 0 && (
                  <span className="dropped">
                    {dropped.slice(0, 4).map(([reason, count]) => (
                      <span key={reason} className="drop">
                        {count} {reason.toLowerCase()}
                      </span>
                    ))}
                  </span>
                )}
              </div>

              {matches.length === 0 && (
                <p className="notice">
                  Nothing matches. Your filters are probably stricter than the data supports — try
                  “Show everything” and tighten from there.
                </p>
              )}

              {matches.length > 0 && shown === 0 && (
                <p className="notice">Nothing new since your last visit that matches your filters.</p>
              )}

              {hot.length > 0 && (
                <section className="board-section board-section-hot">
                  <h2 className="board-section-head">
                    <Flame size={16} /> Posted today <span>{hot.length}</span>
                  </h2>
                  {hotShown.map(renderCard)}
                  {hot.length > HOT_PREVIEW && (
                    <button
                      type="button"
                      className="more"
                      onClick={() => setShowAllHot(!showAllHot)}
                    >
                      {showAllHot ? 'Show fewer' : `Show all ${hot.length} posted today`}
                    </button>
                  )}
                </section>
              )}

              {rest.length > 0 && (
                <section className="board-section">
                  {hot.length > 0 && (
                    <h2 className="board-section-head">
                      Earlier <span>{rest.length}</span>
                    </h2>
                  )}
                  {rest.slice(0, visible).map(renderCard)}
                  {visible < rest.length && (
                    <button
                      type="button"
                      className="more"
                      onClick={() => setVisible(visible + PAGE_SIZE)}
                    >
                      Show {Math.min(PAGE_SIZE, rest.length - visible)} more
                    </button>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
