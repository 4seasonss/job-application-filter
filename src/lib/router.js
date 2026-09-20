import { useCallback, useEffect, useState } from 'react';

// Route names are plain slugs. Anything else in the hash is not ours — an
// OAuth provider returning '#access_token=…' would otherwise be read as a
// route and render a blank page — so it falls back to home.
const read = () => {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return /^[a-z]*$/.test(raw) ? raw || 'home' : 'home';
};

/** Hash routing, so the back button works without pulling in a router. */
export function useRoute() {
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next) => {
    window.location.hash = `#/${next}`;
    window.scrollTo(0, 0);
  }, []);

  return [route, navigate];
}
