import { useCallback, useEffect, useState } from 'react';
import Landing from './components/Landing.jsx';
import Onboarding from './components/Onboarding.jsx';
import JobBoard from './components/JobBoard.jsx';
import { DEFAULT_CONFIG, mergeConfig } from './config/defaults.js';
import { attachSearchText } from './lib/enrich.js';
import { store, onboarding } from './lib/store/index.js';
import { resolveSeen, loadSeen, saveSeen } from './lib/seen.js';
import { useRoute } from './lib/router.js';

export default function App() {
  const [route, navigate] = useRoute();
  const [jobs, setJobs] = useState([]);
  const [status, setStatus] = useState('loading');
  const [fetchedAt, setFetchedAt] = useState(null);
  const [newestPostedAt, setNewestPostedAt] = useState(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [ready, setReady] = useState(false);
  const [newIds, setNewIds] = useState(null);

  // Postings load immediately, even on the landing page, so the board is
  // already populated by the time someone finishes onboarding.
  useEffect(() => {
    let live = true;
    fetch('/api/jobs', { cache: 'no-cache' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        if (!live) return;
        const list = data.jobs.map(attachSearchText);
        // Which postings are new since the last visit. Done here, once per
        // successful load, so a failed fetch never overwrites what we remembered.
        const { newIds: fresh, next } = resolveSeen(loadSeen(), list.map((j) => j.id), Date.now());
        saveSeen(next);
        setNewIds(fresh);
        setJobs(list);
        setFetchedAt(data.fetchedAt);
        setNewestPostedAt(data.newestPostedAt ?? null);
        setStatus('ready');
      })
      .catch(() => live && setStatus('error'));
    return () => {
      live = false;
    };
  }, []);

  // Restore whatever this browser remembers.
  useEffect(() => {
    let live = true;
    store
      .loadProfile()
      .then((saved) => {
        if (!live) return;
        if (saved) setConfig(mergeConfig(saved));
        setReady(true);
      })
      .catch(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);

  // Don't persist until the saved profile has loaded, or the default would
  // overwrite it on first render.
  useEffect(() => {
    if (ready) store.saveProfile(config).catch(() => {});
  }, [config, ready]);

  const update = useCallback((patch) => setConfig((prev) => ({ ...prev, ...patch })), []);
  const reset = useCallback((patch = {}) => setConfig({ ...DEFAULT_CONFIG, ...patch }), []);

  const completeOnboarding = (next) => {
    setConfig(next);
    onboarding.markSeen();
    navigate('jobs');
  };

  // A returning visitor lands straight on their board rather than the pitch.
  useEffect(() => {
    if (ready && route === 'home' && onboarding.seen()) navigate('jobs');
  }, [ready, route, navigate]);

  return (
    <div className="app">
      <nav className="nav">
        <button type="button" className="brand" onClick={() => navigate('jobs')}>
          New Grad Filter
        </button>
        <div className="nav-right">
          {route === 'jobs' && (
            <button type="button" className="link-button" onClick={() => navigate('start')}>
              Redo setup
            </button>
          )}
        </div>
      </nav>

      {route === 'home' && <Landing navigate={navigate} />}

      {route === 'start' && (
        <Onboarding onComplete={completeOnboarding} onSkip={() => completeOnboarding(config)} />
      )}

      {route === 'jobs' && (
        <JobBoard
          jobs={jobs}
          status={status}
          fetchedAt={fetchedAt}
          newestPostedAt={newestPostedAt}
          newIds={newIds}
          config={config}
          update={update}
          reset={reset}
        />
      )}
    </div>
  );
}
