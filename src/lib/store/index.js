// Profile storage.
//
// Everything stays in the visitor's own browser: no accounts, no server-side
// storage, and therefore no personal data to protect. That is a deliberate MVP
// choice — anyone wanting a hosted multi-user version can fork and add one, and
// the `public-version` branch already carries a Supabase email/Google layer.

import { createLocalStore } from './local.js';

export const store = createLocalStore();
export { onboarding } from './local.js';
