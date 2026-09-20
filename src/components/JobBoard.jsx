import { useMemo, useState } from 'react';
import FilterPanel from './FilterPanel.jsx';
import JobCard from './JobCard.jsx';
import { rank } from '../lib/scoring.js';

const PAGE_SIZE = 40;

export default function JobBoard({ jobs, status, fetchedAt, config, update, reset }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const { matches, total, dropped } = useMemo(() => rank(jobs, config), [jobs, config]);

  const change = (patch) => {
    update(patch);
    setVisible(PAGE_SIZE);
  };

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
        <label className="check check-inline">
          <input
            type="checkbox"
            checked={config.hideWeakMatches}
            onChange={(e) => change({ hideWeakMatches: e.target.checked })}
          />
          <span>Skill match only</span>
        </label>
      </div>

      <div className="layout">
        <FilterPanel config={config} update={change} reset={reset} />

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

              {matches.slice(0, visible).map((result) => (
                <JobCard key={result.job.id} result={result} />
              ))}

              {visible < matches.length && (
                <button
                  type="button"
                  className="more"
                  onClick={() => setVisible(visible + PAGE_SIZE)}
                >
                  Show {Math.min(PAGE_SIZE, matches.length - visible)} more
                </button>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
